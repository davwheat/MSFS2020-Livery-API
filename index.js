require('dotenv').config();
const env = process.env;
const app = require('express')();
const port = env.PORT;
const github = require('octonode');
const client = github.client(env.GIT_TOKEN);
const https = require('https');
const Log = require('./logger');

let currentTime = new Date();
let cache = {
  active: false,
  resetTime: currentTime,
  data: {
    liveries: [],
    aircraft: [],
  },
};

function GetNewCacheTime() {
  return new Date(new Date().getTime() + 20 * 60000);
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/', (req, res) => {
  res.status(403).send('Should you be here?');
});

app.get('/packages', async (req, res) => {
  if (!cache.active || cache.resetTime <= currentTime) {
    let ghrepo = client.repo(env.REPO_NAME);
    let aircraftData = [];
    let liveryData = [];

    await ghrepo.contents('/liveries', 'master', (_, data) => {
      if (!data) {
        if (cache.data.liveries.length != 0) {
          return res.json(cache.data);
        } else {
          Log(`No response from the GitHub API!`, Log.SEVERITY.WARNING);
          return res.status(500).json({
            error: true,
            code: 'ERROR: GH-NR',
            message: 'No github response, please try again later',
          });
        }
      }

      data.forEach(aircraft => {
        let aircraftPath = aircraft.path;

        console.log(aircraftPath);
        ghrepo.contents(aircraftPath, 'master', (_, aData) => {
          aData.forEach(content => {
            if (content.name == 'aircraftManifest.json') {
              https.get(`https://raw.githubusercontent.com/${env.REPO_NAME}/master/${content.path}`, resData => {
                let rData = '';

                resData.on('data', chunk => {
                  rData += chunk;
                });

                resData.on('end', () => {
                  if (rData == '404: Not Found') {
                    return Log(`${aircraftPath} has no manifest`, Log.SEVERITY.ERROR);
                  }

                  try {
                    aircraftData.push(JSON.parse(rData));
                  } catch (error) {
                    return Log(`${aircraftPath} has invalid JSON: ${rData}`, Log.SEVERITY.ERROR);
                  }

                  cache.data.aircraft.push(aircraftData);
                });
              });
            }
          });
        });

        aircraftData.forEach(aircraft => {
          aircraft.liveries.forEach(livery => {
            if (!livery.manifestURL) {
              return Log(`${livery.uniqueId} has no manifest`, Log.SEVERITY.ERROR);
            }

            console.log(livery.manifestURL.split('...'));
          });
        });
      });

      cache.active = true;
      cache.resetTime = GetNewCacheTime();
      return res.json(cache.data);
    });
  } else return res.json(cache.data);
});

let listener = app.listen(port || 8080, () => {
  Log(`Listening at localhost:${listener.address().port}`, Log.SEVERITY.INFO);
});
