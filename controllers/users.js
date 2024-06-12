const User = require("../models/user");

module.exports.renderRegister = (req, res) => {
	res.render("users/register");
};

module.exports.register = async (req, res, next) => {
	try {
		const { email, username, password } = req.body;
		const user = new User({ email, username });
		const registeredUser = await User.register(user, password);
		req.login(registeredUser, (err) => {
			if (err) {
				return next(err);
			}
			req.flash("success", "WELCOME TO YELP CAMP!");
			res.redirect("/campgrounds");
		});
	} catch (e) {
		req.flash("error", e.message);
		res.redirect("/register");
	}
};

module.exports.renderLogin = (req, res) => {
	res.render("users/login");
};

module.exports.login = async (req, res) => {
	const redirectUrl = req.session.returnTo || "/campgrounds";
	delete req.session.returnTo;
	req.flash("success", "Oh hey, welcome back!");
	res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
	req.logout(function (err) {
		if (err) {
			return next(err);
		}
		req.flash("success", "You have been successfully logged out!");
		res.redirect("/login");
	});
};
