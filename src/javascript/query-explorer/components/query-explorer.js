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


/* global ga */


import React from 'react';
import accountSummaries from 'javascript-api-utils/lib/account-summaries';

import Datepicker from './datepicker';
import HelpIconLink from './help-icon-link';
import QueryReport from './query-report';
import Select2MultiSuggest from './select2-multi-suggest';
import ViewSelector from './view-selector';

import AlertDispatcher from '../../components/alert-dispatcher';
import SearchSuggest from '../../components/search-suggest';


/**
 * The parameters that are safe to track the values entered by users.
 * All other params are either uninteresting or may possibly contain PII and
 * therefore only their presence/absense is tracked.
 */
const PARAMS_TO_TRACK = ['start-date', 'end-date', 'metrics', 'dimensions'];


export default class QueryExplorer extends React.Component {

  /**
   * Invoked when a user changes the ViewSelector2 instance.
   * @param {Object} viewData The object emited by the ViewSelector2's
   * `changeView` event.
   */
  handleViewSelectorChange = (viewData) => {
    let {actions} = this.props;
    let {ids} = viewData;
    actions.updateParams({ids});
    actions.updateMetricsDimensionsAndSortOptions(viewData);
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


  /**
   * Invoked when a user clicks on the segment definition checkbox.
   * @param {{target: Element}} The React event.
   */
  handleSegmentDefinitionToggle = ({target: {checked: useDefinition}}) => {
    let {actions} = this.props;
    let {segment} = this.props.params;

    actions.updateSettings({useDefinition});
    actions.updateSegmentsOptions();

    if (segment) {
      actions.swapSegmentIdAndDefinition(segment, useDefinition);
    }
  }


  /**
   * Invoked when a user submits the <QueryForm>.
   * @param {Event|Object} e The native or React event.
   */
  handleSubmit = async (e) => {
    e.preventDefault();
    let {actions, params} = this.props;
    let paramsClone = {...params};

    actions.updateReport({params: paramsClone});
    actions.setQueryState(true);

    let trackableParamData = Object.keys(paramsClone).map((key) =>
        PARAMS_TO_TRACK.includes(key) ? `${key}=${paramsClone[key]}` : key)
        .join('&');

    // Set it on the tracker so it gets sent with all Query Explorer hits.
    ga('set', 'dimension2', trackableParamData);

    let summaries = await accountSummaries.get();
    let viewId = params.ids.slice(3);
    let view = summaries.getView(viewId);
    let property = summaries.getPropertyByViewId(viewId);

    actions.updateReport({
      propertyName: property.name,
      viewName: view.name
    });
  }


  /**
   * Invoked when the DataChart component's "success" event emits.
   * @param {Object} data The object emitted by the DataChart's "success" event.
   */
  handleDataChartSuccess = (data) => {
    this.props.actions.setQueryState(false);
    this.props.actions.updateReport({response: data.response});

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
  handleDataChartError = ({error: {code, message}}) => {
    this.props.actions.setQueryState(false);
    this.props.actions.updateReport({params: null, response: null});

    AlertDispatcher.addOnce({
      title: `Ack! There was an error (${code})`,
      message: message
    });

    ga('send', {
      hitType: 'event',
      eventCategory: 'query',
      eventAction: 'submit',
      eventLabel: `(${code}) ${message}`,
      metric2: 1
    });
  }


  /**
   * Invoked when a user clicks on the include `ids` checkbox.
   * @param {{target: Element}} includeIds The React event.
   */
  handleIdsToggle = ({target: {checked: includeIds}}) => {
    this.props.actions.updateSettings({includeIds});
  }


  /**
   * Invoked when a user clicks on the include `access_token` checkbox.
   * @param {{target: Element}} includeAccessToken The React event.
   */
  handleAccessTokenToggle = ({target: {checked: includeAccessToken}}) => {
    this.props.actions.updateSettings({includeAccessToken});
  }

  /**
   * Invoked when a user focuses on the "Direct link to this report" textarea.
   */
  handleDirectLinkFocus() {
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

  render() {

    let {
      isQuerying,
      params,
      report,
      settings,
      select2Options
    } = this.props;

    let formControlClass = 'FormControl FormControl--inline';
    let formActionClass = formControlClass + ' FormControl--action';
    let requiredFormControlClass = formControlClass +' FormControl--required';

    return (
      <div>
        <h3 className="H3--underline">Select a view</h3>

        <ViewSelector
          ids={params.ids}
          onChange={this.handleViewSelectorChange} />

        <h3 className="H3--underline">Set the query parameters</h3>

        <form onSubmit={this.handleSubmit}>

          <div className={requiredFormControlClass}>
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

          <div className={requiredFormControlClass}>
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

          <div className={requiredFormControlClass}>
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

          <div className={requiredFormControlClass}>
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

          <div className={formControlClass}>
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

          <div className={formControlClass}>
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

          <div className={formControlClass}>
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

          <div className={formControlClass}>
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

          <div className={formControlClass}>
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

          <div className={formControlClass}>
            <label className="FormControl-label">include-empty-rows</label>
            <div className="FormControl-body">
              <div className="FlexLine">
                <input
                  className="FormField FormFieldCombo-field"
                  name="include-empty-rows"
                  value={params['include-empty-rows']}
                  onChange={this.handleParamChange} />
                <HelpIconLink name="include-empty-rows" />
              </div>
            </div>
          </div>

          <div className={formControlClass}>
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

          <div className={formControlClass}>
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

          <div className={formActionClass}>
            <div className="FormControl-body">
              <button
                className="Button Button--action"
                disabled={isQuerying}>
                {isQuerying ? 'Loading...' : 'Run Query'}
              </button>
            </div>
          </div>

        </form>

        <QueryReport
          report={report}
          isQuerying={isQuerying}
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
