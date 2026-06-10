const mongoose = require("mongoose");
const { Schema } = mongoose;

const Review = require("./review");

const ImageSchema = new Schema({
	url: String,
	filename: String,
});

ImageSchema.virtual("thumbnail").get(function () {
	return this.url.replace("/upload", "/upload/w_200");
});

ImageSchema.virtual("slide").get(function () {
	return this.url.replace("/upload", "/upload/w_900");
});

const opts = { toJSON: { virtuals: true }, toObject: { virtuals: true } };

const spotSchema = new Schema(
	{
		name: String,
		images: [ImageSchema],
		geometry: {
			type: {
				type: String,
				enum: ["Point"],
				required: true,
			},
			coordinates: {
				type: [Number],
				required: true,
			},
		},
		description: String,
		location: String,
		author: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		reviews: [
			{
				type: Schema.Types.ObjectId,
				ref: "Review",
			},
		],
	},
	opts
);

spotSchema.virtual("properties.popUpMarkup").get(function () {
	return `<a class="link" href="/spots/${this._id}">${this.name}</a>`;
});

spotSchema.post("findOneAndDelete", async function (doc) {
	if (doc) {
		await Review.deleteMany({
			_id: {
				$in: doc.reviews,
			},
		});
	}
});

spotSchema.index(
	{
		name: "text",
		location: "text",
	},
	{
		weights: {
			name: 3,
			location: 1,
		},
	}
);

module.exports = mongoose.model("Spot", spotSchema);
