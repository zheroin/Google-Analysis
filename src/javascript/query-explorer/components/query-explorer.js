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


/* global $, ga, gapi */


import Datepicker from './datepicker';
import HelpIconLink from './help-icon-link';
import map from 'lodash/collection/map';
import Model from '../../model';

import QueryReport from './query-report';
import React from 'react';
import ReactDOM from 'react-dom';
import SearchSuggest from '../../components/search-suggest';
import Select2MultiSuggest from './select2-multi-suggest';
import ViewSelector from './view-selector';


/**
 * The parameters that are safe to track the values entered by users.
 * All other params are either uninteresting or may possibly contain PII and
 * therefore only their presence/absense is tracked.
 */
const PARAMS_TO_TRACK = ['start-date', 'end-date', 'metrics', 'dimensions'];



export default class QueryExplorer extends React.Component {

  state = {
    isAuthorized: false
  };

  constructor(props) {
    super(props);

    this._state = new Model();
  }


  /**
   * Invoked when a user changes the ViewSelector2 instance.
   * @param {Object} data The object emited by the ViewSelector2's "changeView"
   * event.
   */
  handleViewSelectorChange = async (viewData) => {
    this._state.set('selectedAccountData', {...viewData});

    this.props.actions.updateViewData(viewData);
    this.props.actions.updateParams({ids: viewData.ids});
    this.props.actions.updateMetricsDimensionsAndSortOptions();
  }


  /**
   * Invoked when a user changes any of the <QueryForm> fields.
   * @param {Event|Object} e A native Event object, React event, or data object
   *     containing the target.name and target.value properties.
   */
  handleParamChange = ({target: {name, value}}) => {
    this.props.actions.updateParams({[name]: value});

    if (name == 'metrics' || name == 'dimensions') {
      this.props.actions.updateSortOptions();
    }
  }


  handleUserAuthorized() {
    this.props.actions.updateSegmentsOptions();

    this.setState({
      isAuthorized: true
    });
  }


  /**
   * Invoked when a user clicks on the segment definition checkbox.
   * @param {{target: Element}} The React event.
   */
  handleSegmentDefinitionToggle = ({target: {checked: useDefinition}}) => {
    let {segment} = this.props.params;
    this.props.actions.updateSettings({useDefinition});
    this.props.actions.swapSegmentIdAndDefinition(segment, useDefinition);
  }



  /**
   * Invoked when a user clicks on the include `ids` checkbox.
   * @param {SyntheticEvent} e The React event.
   */
  handleIdsToggle = ({target: {checked: includeIds}}) => {
    this.props.actions.updateSettings({includeIds});
  }


  /**
   * Invoked when a user clicks on the include `access_token` checkbox.
   * @param {SyntheticEvent} e The React event.
   */
  handleAccessTokenToggle = ({target: {checked: includeAccessToken}}) => {
    this.props.actions.updateSettings({includeAccessToken});
  }


  /**
   * Invoked when the DataChart component's "success" event emits.
   * @param {Object} data The object emitted by the DataChart's "success" event.
   */
  handleDataChartSuccess = (data) => {
    this._state.set({
      isQuerying: false,
      report: {
        accountData: {...this._state.get('selectedAccountData')},
        params: this._state.get('report').params,
        response: data.response
      }
    });

    ga('send', {
      hitType: 'event',
      eventCategory: 'query',
      eventAction: 'submit',
      eventLabel: '(200) OK',
      metric1: 1
    });
  }


  /**
   * Invoked when the DataChart component's "error" event emits.
   * @param {Object} data The error emitted by the DataChart's "error" event.
   */
  handleDataChartError = (err) => {
    this._state.set({
      isQuerying: false,
      report: {
        accountData: {...this._state.get('selectedAccountData')},
        params: state.get('report').params,
        error: err.error
      }
    });

    ga('send', {
      hitType: 'event',
      eventCategory: 'query',
      eventAction: 'submit',
      eventLabel: `(${err.error.code}) ${err.error.message}`,
      metric2: 1
    });
  }


  /**
   * Invoked when a user submits the <QueryForm>.
   * @param {Event|Object} e The native or React event.
   */
  handleSubmit = (e) => {
    e.preventDefault();

    let paramsClone = {...this.props.params};

    let trackableParamData = map(paramsClone, (value, key) => {
      // Don't run `encodeURIComponent` on these params because the they will
      // never contain characters that make parsing fail (or be ambiguous).
      // NOTE: Manual serializing is requred until the encodeURIComponent override
      // is supported here: https://github.com/Gozala/querystring/issues/6
      return PARAMS_TO_TRACK.includes(key) ? `${key}=${value}` : key;
    }).join('&');

    // Set it on the tracker so it gets sent with all Query Explorer hits.
    ga('set', 'dimension2', trackableParamData);

    this._state.set({
      isQuerying: true,
      report: {
        params: paramsClone
      }
    });
  }


  /**
   * Invoked when a user focuses on the "Direct link to this report" textarea.
   */
  handleDirectLinkFocus(e) {
    ga('send', 'event', 'query direct link', 'focus');
  }


  /**
   * Invoked when a user focuses on the "API Query URI" textarea.
   */
  handleApiUriFocus() {
    ga('send', 'event', 'query api uri', 'focus');
  }


  /**
   * Invoked when a user clicks the "Download Results as TSV" button.
   */
  handleDownloadTsvClick() {
    ga('send', 'event', 'query tsv download', 'click');
  }


  /**
   * React lifecycyle method below:
   * http://facebook.github.io/react/docs/component-specs.html
   * ---------------------------------------------------------
   */

  componentWillReceiveProps(nextProps) {
    if (nextProps.isAuthorized && !this.state.isAuthorized) {
      this.handleUserAuthorized();
    }
  }

  render() {

    let {actions, params, settings, select2Options} = this.props;

    return (
      <div>
        <h3 className="H3--underline">Select a view</h3>

        <ViewSelector
          ids={params.ids}
          onChange={this.handleViewSelectorChange} />

        <h3 className="H3--underline">Set the query parameters</h3>

        <form onSubmit={this.handleSubmit}>

          <div className="FormControl FormControl--inline FormControl--required">
            <label className="FormControl-label">ids</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <input
                  className="FormField FormFieldCombo-field"
                  name="ids"
                  value={params.ids}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="ids" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline FormControl--required">
            <label className="FormControl-label">start-date</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <Datepicker
                  name="start-date"
                  value={params['start-date']}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="start-date" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline FormControl--required">
            <label className="FormControl-label">end-date</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <Datepicker
                  name="end-date"
                  value={params['end-date']}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="end-date" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline FormControl--required">
            <label className="FormControl-label">metrics</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <Select2MultiSuggest
                  name="metrics"
                  value={params.metrics}
                  tags={select2Options.metrics}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="metrics" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline">
            <label className="FormControl-label">dimensions</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <Select2MultiSuggest
                  name="dimensions"
                  value={params.dimensions}
                  tags={select2Options.dimensions}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="dimensions" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline">
            <label className="FormControl-label">sort</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <Select2MultiSuggest
                  name="sort"
                  value={params.sort}
                  tags={select2Options.sort}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="sort" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline">
            <label className="FormControl-label">filters</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <input
                  className="FormField FormFieldCombo-field"
                  name="filters"
                  value={params.filters}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="filters" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline">
            <label className="FormControl-label">segment</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <SearchSuggest
                  name="segment"
                  value={params.segment}
                  options={select2Options.segments}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="segment" />
              </div>
              <div className="FormControl-info">
                <label>
                  <input
                    className="Checkbox"
                    type="checkbox"
                    onChange={this.handleSegmentDefinitionToggle}
                    checked={settings.useDefinition} />
                  Show segment definitions instead of IDs.
                </label>
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline">
            <label className="FormControl-label">samplingLevel</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <input
                  className="FormField FormFieldCombo-field"
                  name="samplingLevel"
                  value={params.samplingLevel}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="samplingLevel" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline">
            <label className="FormControl-label">start-index</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <input
                  className="FormField FormFieldCombo-field"
                  name="start-index"
                  value={params['start-index']}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="start-index" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline">
            <label className="FormControl-label">max-results</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <input
                  className="FormField FormFieldCombo-field"
                  name="max-results"
                  value={params['max-results']}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="max-results" />
              </div>
            </div>
          </div>

          <div className="FormControl FormControl--inline FormControl--action">
            <div className="FormControl-body">
              <button
                className="Button Button--action"
                disabled={this._state.get('isQuerying')}>
                {this._state.get('isQuerying') ? 'Loading...' : 'Run Query'}
              </button>
            </div>
          </div>

        </form>

        <QueryReport
          report={this._state.get('report')}
          isQuerying={this._state.get('isQuerying')}
          includeIds={settings.includeIds}
          includeAccessToken={settings.includeAccessToken}
          onSuccess={this.handleDataChartSuccess}
          onError={this.handleDataChartError}
          onIdsToggle={this.handleIdsToggle}
          onAccessTokenToggle={this.handleAccessTokenToggle}
          onDirectLinkFocus={this.handleDirectLinkFocus}
          onApiUriFocus={this.handleApiUriFocus}
          onDownloadTsvClick={this.handleDownloadTsvClick} />

      </div>
    );
  }

}

