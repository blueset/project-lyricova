import express from "express";
import compression from "compression"; // compresses requests
import bodyParser from "body-parser";
import flash from "express-flash";
import passport from "passport";

const app = express();

app.set("port", process.env.PORT || 3000);
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get("/", async (req, res) => {
  res.send("Hello world!");
});

export default app;
