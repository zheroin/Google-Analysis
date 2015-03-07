// Copyright 2015 Google Inc. All rights reserved.
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


import assign from 'lodash-node/modern/object/assign';
import mapValues from 'lodash-node/modern/object/mapValues';
import React from 'react';


const SRC_PARAM = 'query-explorer:v2';


var DataChart = React.createClass({
  componentDidMount: function() {
    this.dataChart_ = new gapi.analytics.googleCharts.DataChart({
      query: assign({}, this.props.query, {_src: SRC_PARAM}),
      chart: {
        type: 'TABLE',
        container: this.getDOMNode()
      }
    });

    this.dataChart_.on('error', this.props.onError.bind(this));
    this.dataChart_.on('success', this.props.onSuccess.bind(this));
  },
  componentWillReceiveProps: function(props) {
    if (props.query && props.isQuerying) {

      // The Embed API has its own defaults for these values, so we need to
      // explicitly set them in case the user doesn't.
      let defaults = {
        'start-date': '',
        'end-date': ''
      };

      // Nullify the existing props
      // TODO(philipwalton): .set() should ideally be able to handle
      // sending it new properties without merging.
      let nulledOldQuery = mapValues(this.dataChart_.get().query, () => null);
      let newQuery = assign(defaults, nulledOldQuery, props.query);

      this.dataChart_.set({query: newQuery}).execute();
    }
  },
  componentWillUnmount: function() {
    this.dataChart_.off();
  },
  render: function() {
    return (<div className={this.props.className} />);
  }
});


export default DataChart
