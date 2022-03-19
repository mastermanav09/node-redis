const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const fs = require("fs");
const morgan = require("morgan");
const cors = require("cors");
const { createClient } = require("redis");

const client = createClient({
  legacyMode: true,
});

(async () => {
  await client.connect();
})();

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  {
    flags: "a",
  }
);

app.use(morgan("combined", { stream: accessLogStream }));

app.set("view engine", "ejs");
app.set("views", "views");

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));

app.get("/", (req, res, next) => {
  res.render("searchUsers", { docTitle: "Redis User Management", error: null });
});

app.post("/user/search", async (req, res, next) => {
  let id = req.body.id;

  try {
    await client.hGetAll(id, async (err, obj) => {
      if (!obj || obj.length === 0) {
        res.render("searchUsers", {
          docTitle: "Redis User Management",
          error: "User does not exists!",
        });
      } else {
        obj.id = id;
        res.render("details", {
          docTitle: "User :" + obj[1],
          user: obj,
          error: null,
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/user/add", async (req, res, next) => {
  res.render("addUser", { docTitle: "Add Users", error: null });
});

app.post("/user/add", async (req, res, next) => {
  const user = {
    id: req.body.id,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
  };

  let error = null;

  try {
    function callback(err, reply) {
      if (err) {
        console.log(err);
        error = err;
      } else {
        console.log(reply);
      }
    }

    await client.hSet(user.id, "first_name", user.firstName, callback);
    await client.hSet(user.id, "last_name", user.lastName, callback);
    await client.hSet(user.id, "email", user.email, callback);
    await client.hSet(user.id, "phone", user.phone, callback);

    if (!error) {
      res.redirect("/");
    }
  } catch (error) {
    console.log(error);
  }
});

app.delete("/user/delete/:userId", async (req, res, next) => {
  const userId = req.params.userId;

  try {
    await client.hGetAll(userId, async (err, res) => {
      if (res && Array(res).length !== 0) {
        res.forEach((det) => client.hDel(userId, det));
      }
    });

    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});

app.listen(8000, () => console.log("Server is running!"));
