/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const express = require('express');
const app = express();
const config = require('config');
const sttConfig = config.get('watson.stt')
const orchestratorConfig = config.get('orchestrator')
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
const AuthorizationV1 = require('watson-developer-cloud/authorization/v1');
const IamTokenManagerV1 = require('watson-developer-cloud/iam-token-manager/v1');
const rp = require('request-promise');
const logger = require('./src/logger');

// Bootstrap application settings
require('./src/express')(app);

// Create the token manager
let tokenManager;
let instanceType;
const serviceUrl = sttConfig.SPEECH_TO_TEXT_URL || 'https://stream.watsonplatform.net/speech-to-text/api';
const orchestratorVgUrl = orchestratorConfig.ORCHESTRATOR_VG_URL || 'https://localhost:1880/vg/events';

if (sttConfig.SPEECH_TO_TEXT_IAM_APIKEY && sttConfig.SPEECH_TO_TEXT_IAM_APIKEY !== '') {
  instanceType = 'iam';
  tokenManager = new IamTokenManagerV1.IamTokenManagerV1({
    iamApikey: sttConfig.SPEECH_TO_TEXT_IAM_APIKEY || '<iam_apikey>',
    iamUrl: sttConfig.SPEECH_TO_TEXT_IAM_URL || 'https://iam.bluemix.net/identity/token',
  });
} else {
  instanceType = 'cf';
  const speechService = new SpeechToTextV1({
    username: sttConfig.SPEECH_TO_TEXT_USERNAME || '<username>',
    password: sttConfig.SPEECH_TO_TEXT_PASSWORD || '<password>',
    url: serviceUrl,
  });
  tokenManager = new AuthorizationV1(speechService.getCredentials());
}

app.get('/', (req, res) => res.render('index'));

// Get credentials using your credentials
app.get('/api/credentials', (req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`)

  tokenManager.getToken((err, token) => {
    if (err) {
      next(err);
    } else {
      let credentials;
      if (instanceType === 'iam') {
        credentials = {
          accessToken: token,
          serviceUrl,
        };
      } else {
        credentials = {
          token,
          serviceUrl,
        };
      }
      res.json(credentials);
    }
  });
});

app.post('/api/orchestrator', (req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body)}`)

  if (!req.body || !req.body.results || !req.body.results[0].alternatives
    || !req.body.results[0].alternatives[0]) {
    return next('transcript required');
  }

  const sessionId = req.body.sessionId;
  const agentExtensionId = req.body.agentExtensionId;
  const transcript = req.body.results[0].alternatives[0].transcript;
  const confidence = req.body.results[0].alternatives[0].confidence;

  logger.debug(`orchestrator agentExtensionId ${agentExtensionId}: transcript '${transcript}': confidence ${confidence}`)

  const requestBody = {
    alternateIntents: false,
    input: {
      text: transcript,
    },
    context: {
      vgwIsCaller: 'No',
      vgwSTTResponse: {},
      vgwSessionID: sessionId,
      vgwTranscriptionSource: `${agentExtensionId}@8.8.242.72:5060`,
      conversation_id: sessionId,
    },
  };

  const options = {
    method: 'POST',
    uri: orchestratorVgUrl,
    headers: { Accept: 'application/json' },
    json: true,
    body: requestBody,
  };

  logger.debug(`orchestrator body ${JSON.stringify(options)}`);

  return rp(options)
    .then((data) => {
      logger.debug('orchestrator post submitted');
      return res.json(data);
    })
    .catch((err) => {
      logger.error(`error: ${JSON.stringify(err)}`);
      return next(err);
    });
});

module.exports = app;
