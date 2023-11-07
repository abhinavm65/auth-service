const express = require("express");
const app = express();
const port = process.env.PORT || 3000; // You can change this to your desired port
const axios = require("axios");

// Method to request access token and refresh token
const requestTokens = async (code) => {
  const body =
    "code=" +
    code +
    "&client_id=" +
    "830851649656-41keebuq8avu3dijjmfj1psugd18p54o.apps.googleusercontent.com" +
    "&client_secret=" +
    "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" +
    "&redirect_uri=" +
    "https://auth-web-service-o3kg.onrender.com/auth" +
    "&grant_type=authorization_code";

  const response = await axios.post(
    `https://accounts.google.com/o/oauth2/token`,
    body
  );
  return response.data;
};

const refreshTokens = async (body) => {
    const head = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-length" : body.length
      }
    };
  const response = await axios.post(
    `https://accounts.google.com/o/oauth2/token`,
    body,
    head
  );
  return response.data;
};

// Method to request user info
const requestUserInfo = async (accessToken) => {
  const head = {
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const userResponse = await axios.get(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    head
  );
  return userResponse.data;
};

// Method to send response to Salesforce
const sendResponseToSalesforce = async (
  url,
  userId,
  accessToken,
  refreshToken,
  sub,
  given_name,
  family_name,
  picture
) => {
  const responseToSend = {
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: userId,
    sub: sub,
    given_name: given_name,
    family_name: family_name,
    picture: picture,
  };

  const finalResponse = await axios.post(
    `${url}/services/apexrest/wk_googlefit/auth`,
    responseToSend
  );
  return finalResponse;
};

app.get("/auth", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  console.log(code, state);

  if (code) {
    try {
      const userId = state.split("?userId=").pop();
      const url = state.substring(0, state.indexOf("?userId="));



      const { access_token, refresh_token } = await requestTokens(code);

      console.log('accesstoken',access_token);
      console.log('url',url);

      const { sub, given_name, family_name, picture } = await requestUserInfo(access_token);

      const isSuccess = await sendResponseToSalesforce(
        url,
        userId,
        access_token,
        refresh_token,
        sub,
        given_name,
        family_name,
        picture
      );

      if (isSuccess) {
        res.redirect(`${url}/s`);
      }
    }
    catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.status(400).send('Missing "code" query parameter');
  }
});
app.use(express.json());
// Call middleware, storing a reference to it:
const middle = express.urlencoded({ extended: false })
app.post("/refresh-token",middle, async (req, res) => {
  const body = req.body;

  if (body) {
    try {
      const tokenResponse = await refreshTokens(body);
     if(tokenResponse) {
      res. status(200). json(tokenResponse);
     }
    }
    catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.status(400).send('Missing credentials query parameter');
  }
});

app.listen(port, () => {
  console.log(`Node.js server is running on port ${port}`);
});

