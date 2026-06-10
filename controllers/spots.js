const Spot = require("../models/spot");

const { cloudinary } = require("../cloudinary");
const { geocodeLocation } = require("../utils/geocoding");

module.exports.showAllSpots = async (req, res) => {
	const { search } = req.query;
	let spots;

	if (search) {
		spots = await Spot.find(
			{ $text: { $search: search } },
			{ score: { $meta: "textScore" } }
		).sort({ score: { $meta: "textScore" } });
	} else {
		spots = await Spot.find({});
	}

	res.render("spots/all-spots", { spots, search, title: "All Spots" });
};

module.exports.renderNewForm = (req, res) => {
	res.render("spots/new-spot", { title: "Create New Spot" });
};

module.exports.createSpot = async (req, res, next) => {
	try {
		const spot = new Spot(req.body.spot);
		const geometry = await geocodeLocation(req.body.spot.location);

		spot.geometry = geometry;
		spot.images = req.files.map((f) => ({
			url: f.path,
			filename: f.filename,
		}));
		spot.author = req.user._id;

		await spot.save();

		req.flash("success", "Successfully created a new spot.");
		res.redirect(`/spots/${spot._id}`);
	} catch (error) {
		req.flash("error", error.message);
		return res.redirect("/spots/new");
	}
};

module.exports.showSpot = async (req, res) => {
	const spot = await Spot.findById(req.params.id)
		.populate({
			path: "reviews",
			populate: {
				path: "author",
			},
		})
		.populate("author");

	if (!spot) {
		req.flash("error", "Cannot find that spot.");
		return res.redirect("/spots");
	}

	const latitude = spot.geometry.coordinates[1];
	const longitude = spot.geometry.coordinates[0];
	const googleMapsUrl = encodeURI(
		`${process.env.GOOGLE_MAPS_BASE_URL}&query=${latitude},${longitude}`
	);

	res.render("spots/view-spot", { spot, googleMapsUrl, title: spot.name });
};

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params;
	const spot = await Spot.findById(id);

	if (!spot) {
		req.flash("error", "Cannot find that spot.");
		return res.redirect("/spots");
	}

	res.render("spots/edit-spot", { spot, title: "Edit Spot" });
};

module.exports.updateSpot = async (req, res) => {
	const { id } = req.params;

	const currentSpot = await Spot.findById(id);
	if (
		req.body.spot.location &&
		req.body.spot.location !== currentSpot.location
	) {
		try {
			req.body.spot.geometry = await geocodeLocation(
				req.body.spot.location
			);
		} catch (error) {
			req.flash("error", error.message);
			return res.redirect(`/spots/${id}/edit`);
		}
	} else {
		req.body.spot.geometry = currentSpot.geometry;
	}

	const spot = await Spot.findByIdAndUpdate(id, {
		...req.body.spot,
		geometry: req.body.spot.geometry,
	});

	const images = req.files.map((f) => ({
		url: f.path,
		filename: f.filename,
	}));
	spot.images.push(...images);
	await spot.save();

	if (req.body.deleteImages) {
		for (let filename of req.body.deleteImages) {
			await cloudinary.uploader.destroy(filename);
		}
		await spot.updateOne({
			$pull: { images: { filename: { $in: req.body.deleteImages } } },
		});
	}

	req.flash("success", "Spot successfully updated.");
	res.redirect(`/spots/${spot._id}`);
};

module.exports.deleteSpot = async (req, res) => {
	const { id } = req.params;

	await Spot.findByIdAndDelete(id);

	req.flash("success", "Spot successfully deleted.");
	res.redirect("/spots");
};
