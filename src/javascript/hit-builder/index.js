// Copyright 2016 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/* global gapi */


import React from 'react';
import ReactDOM from 'react-dom';
import {connect, Provider} from 'react-redux';
import {bindActionCreators, createStore} from 'redux';

import actions from './actions';
import HitBuilder from './components/hit-builder';
import {convertHitToParams, getInitialHitAndUpdateUrl} from './hit';
import reducer from './reducers';

import site from '../site';


const store = createStore(reducer, {
  hitStatus: 'UNVALIDATED',
  params: convertHitToParams(getInitialHitAndUpdateUrl())
});


function mapStateToProps(state) {
  return state;
}


function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch)
  }
}


let HitBuilderApp = connect(mapStateToProps, mapDispatchToProps)(HitBuilder);


/**
 * The base render function.
 */
function render(props) {
  ReactDOM.render(
    <Provider store={store}>
      <HitBuilderApp {...props} />
    </Provider>,
    document.getElementById('hit-builder')
  );
}


/**
 * The callback invoked when the Embed API has authorized the user.
 * Updates the CSS state classes and rerenders in the authorized state.
 */
function setup() {
  render({isAuthorized: true});
  site.setReadyState();
}


// Run setup when the Embed API is ready and the user is authorized.
gapi.analytics.ready(function() {
  if (gapi.analytics.auth.isAuthorized()) {
    setup();
  }
  else {
    gapi.analytics.auth.once('success', setup);
  }
});


// Perform an initial render.
store.subscribe(render);
render();
