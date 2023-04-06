const withTM = require("next-transpile-modules")(["three"]);

module.exports = withTM({
  images: {
    domains: ["res.cloudinary.com"],
  },
  reactStrictMode: true,
});
