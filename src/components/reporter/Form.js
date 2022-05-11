import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { StaticQuery, graphql } from "gatsby";

import Agreement from "../content/Agreement.js";
import FormField from "./widgets/FormField";
import LinesOfCode from "../reporter/LinesOfCodeInput.js";
import Widget from "./widgets/Widget";

import * as styles from "./Form.module.scss";
import * as widgetStyles from "./widgets/Widgets.module.scss";

const config = {
  labelAll: "bug",
};

const emailField = {
  name: "email",
  label: "Email address",
  helpText: "Used to send a copy of this form for your records",
  widget: "text",
  required: true,
};

const addressField = {
  name: "polygonAddress",
  label: "Polygon address",
  helpText:
    "Address where your prize should go. If you use a smart contract wallet, please contact one of our organizers in Discord in addition to adding the address here.",
  widget: "text",
  required: true,
};

const titleField = {
  name: "title",
  label: "Title",
  helpText:
    "Summarize your findings for the bug or vulnerability. (This will be the issue title.)",
  widget: "text",
  required: true,
};

const riskField = {
  name: "risk",
  label: "Risk rating",
  widget: "select",
  required: true,
  options: [
    {
      label: "Gas Optimizations",
      value: "G (Gas Optimization)",
    },
    {
      label: "QA Report (low / non-critical)",
      value: "QA (Quality Assurance)",
    },
    {
      label: "Medium Risk",
      value: "2 (Med Risk)",
    },
    {
      label: "High Risk",
      value: "3 (High Risk)",
    },
  ],
};

const vulnerabilityDetailsField = {
  name: "details",
  label: "Vulnerability details",
  helpText: "Link to all referenced sections of code in GitHub",
  widget: "textarea",
  required: true,
};

const qaGasDetailsField = {
  name: "qaGasDetails",
  label: "Vulnerability details",
  helpText: "Link to all referenced sections of code in GitHub",
  widget: "textarea",
  required: true,
};

const FormStatus = {
  Unsubmitted: "unsubmitted",
  Submitting: "submitting",
  Submitted: "submitted",
  Error: "error",
};

const wardensQuery = graphql`
  query Wardens {
    allHandlesJson(sort: { fields: handle, order: ASC }) {
      edges {
        node {
          id
          handle
          image {
            childImageSharp {
              resize(width: 64, quality: 90) {
                src
              }
            }
          }
        }
      }
    }
  }
`;

const FindingContent = ({
  hasValidationErrors,
  state,
  handleChange,
  handleLocChange,
  isQaOrGasFinding,
}) => {
  return isQaOrGasFinding ? (
    <FormField
      name={qaGasDetailsField.name}
      label={qaGasDetailsField.label}
      helpText={qaGasDetailsField.helpText}
      isInvalid={hasValidationErrors && !state.qaGasDetails}
    >
      <Widget
        field={qaGasDetailsField}
        onChange={handleChange}
        fieldState={state}
        isInvalid={hasValidationErrors && !state.qaGasDetails}
      />
    </FormField>
  ) : (
    <>
      <FormField
        name={titleField.name}
        label={titleField.label}
        helpText={titleField.helpText}
        isInvalid={hasValidationErrors && !state.title}
      >
        <Widget
          field={titleField}
          onChange={handleChange}
          fieldState={state}
          isInvalid={hasValidationErrors && !state.title}
        />
      </FormField>
      <LinesOfCode
        onChange={handleLocChange}
        linesOfCode={state.linesOfCode}
        hasValidationErrors={hasValidationErrors}
      />
      <FormField
        name={vulnerabilityDetailsField.name}
        label={vulnerabilityDetailsField.label}
        helpText={vulnerabilityDetailsField.helpText}
        isInvalid={hasValidationErrors && !state.details}
      >
        <Widget
          field={vulnerabilityDetailsField}
          onChange={handleChange}
          fieldState={state}
          isInvalid={hasValidationErrors && !state.details}
        />
      </FormField>
    </>
  );
};

const checkTitle = (title, risk) => {
  if (risk === "G (Gas Optimization)") {
    return "Gas Optimizations";
  } else if (risk === "QA (Quality Assurance)") {
    return "QA Report";
  } else {
    return title;
  }
};

const Form = ({ contest, sponsor, repoUrl, initialState }) => {
  // Component State
  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState(FormStatus.Unsubmitted);
  const [hasValidationErrors, setHasValidationErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("An error occurred");
  const [isQaOrGasFinding, setIsQaOrGasFinding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const locString = state.linesOfCode.map((loc) => loc.value).join("\n");
  const details = isQaOrGasFinding ? state.qaGasDetails : state.details;
  const markdownBody = `# Lines of code\n\n${locString}\n\n\n# Vulnerability details\n\n${details}\n\n`;
  const labelSet = [config.labelAll, state.risk ? state.risk : ""];
  const submissionUrl = `/.netlify/functions/submit-finding`;

  // const formData = {
  //   contest, // ok -- in state
  //   sponsor, // ok -- in state
  //   repo: repoUrl.split("/").pop(), // ok -- in state
  //   email: state.email, // ok -- in state
  //   handle: state.handle, // ok -- in state
  //   address: state.polygonAddress, // ok -- in state
  //   risk: state.risk ? state.risk.slice(0, 1) : "", // ok -- in state
  //   title, // ok -- in state
  //   body: isQaOrGasFinding ? details : markdownBody, // ok - in submit
  //   labels: labelSet, // ok -- in state
  // };

  // fetch initial state from local storage
  useEffect(() => {
    if (typeof window !== `undefined`) {
      const dataObject = JSON.parse(window.localStorage.getItem(contest));
      let riskIndex = null;
      if (dataObject && dataObject.risk !== "") {
        riskIndex = riskField.options.findIndex(
          (element) => element.value === dataObject.risk
        );
      }

      setState({
        contest: contest,
        sponsor: sponsor,
        repo: repoUrl.split("/").pop(),
        labels: labelSet,
        title: dataObject?.title || "",
        email: dataObject?.email || "",
        handle: dataObject?.handle || "",
        polygonAddress: dataObject?.polygonAddress || "", // attention was address in the formData !
        risk: riskIndex !== null ? riskField.options[riskIndex].value : "",
        details: dataObject?.details || initialState.mdTemplate,
        qaGasDetails: dataObject?.qaGasDetails || "",
        linesOfCode:
          dataObject?.linesOfCode && dataObject?.linesOfCode.length > 0
            ? dataObject?.linesOfCode
            : [
                {
                  id: Date.now(),
                  value: "",
                },
              ],
      });
      if (riskIndex !== null && riskField.options[riskIndex].value) {
        riskField.options[riskIndex].value.slice(0, 1) === "G" ||
        riskField.options[riskIndex].value.slice(0, 1) === "Q"
          ? setIsQaOrGasFinding(true)
          : setIsQaOrGasFinding(false);
      }
    }
  }, [contest, repoUrl, sponsor, initialState.mdTemplate]); // if add labelSet --> infinite loop

  // update local storage
  useEffect(() => {
    if (typeof window !== `undefined`) {
      window.localStorage.setItem(contest, JSON.stringify(state));
    }
  }, [state, contest]);

  // Event Handlers
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
      setState((state) => {
        return { ...state, [name]: value };
      });
  }, []);

  const handleLocChange = useCallback((linesOfCode) => {
    setState((state) => {
      return { ...state, linesOfCode };
    });
  }, []);

  const handleRiskChange = useCallback(
    (e) => {
      handleChange(e);
      const riskLevel = e.target.value.slice(0, 1);
      if (riskLevel === "G" || riskLevel === "Q") {
        setIsQaOrGasFinding(true);
      } else {
        setIsQaOrGasFinding(false);
      }
    },
    [handleChange]
  );

  const handleSubmit = () => {
    // extract required fields from field data for validation check
    const formatedRisk = state.risk ? state.risk.slice(0, 1) : "";
    const formatedTitle = checkTitle(state.title, state.risk);
    const formatedBody = isQaOrGasFinding ? details : markdownBody;
    const { email, handle, address } = state;
    const requiredFields = isQaOrGasFinding
      ? [email, handle, address, formatedRisk, formatedBody]
      : [email, handle, address, formatedRisk, formatedTitle, formatedBody];
    let hasErrors = requiredFields.some((field) => {
      return field === "" || field === undefined;
    });

    // TODO: verify that loc include code lines and are valid URLs
    if (!isQaOrGasFinding && !state.linesOfCode[0].value) {
      hasErrors = true;
    }

    const regex = new RegExp("#L", "g");
    const hasInvalidLinks = state.linesOfCode.some((line) => {
      return !regex.test(line.value);
    });

    setHasValidationErrors(hasErrors || hasInvalidLinks);
    if (!hasErrors) {
      submitFinding(submissionUrl, { ...state, body: formatedBody });
      if (typeof window !== `undefined`) {
        window.localStorage.removeItem(contest);
      }
      setIsExpanded(false);
    }
  };

  const handleReset = () => {
    setState(initialState);
    setStatus(FormStatus.Unsubmitted);
  };

  const submitFinding = useCallback((url, data) => {
    (async () => {
      setStatus(FormStatus.Submitting);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        setStatus(FormStatus.Submitted);
      } else {
        setStatus(FormStatus.Error);
        const message = await response.json();
        if (message) {
          setErrorMessage(message);
        }
      }
    })();
  }, []);

  return (
    <StaticQuery
      query={wardensQuery}
      render={(data) => {
        const wardens = data.allHandlesJson.edges.map(({ node }) => {
          return { value: node.handle, image: node.image };
        });

        return (
          <div
            className={
              !isExpanded
                ? clsx(styles.Form)
                : clsx(styles.Form, styles.FormMax)
            }
          >
            <div className={clsx(styles.FormHeader)}>
              <h1>{sponsor} contest finding</h1>
              <img
                src={isExpanded ? "/images/compress.svg" : "/images/expand.svg"}
                alt={isExpanded ? "compress form" : "expand form"}
                className={clsx(styles.FormIcons)}
                onClick={() => setIsExpanded(!isExpanded)}
              />
            </div>
            {(status === FormStatus.Unsubmitted ||
              status === FormStatus.Submitting) && (
              <form>
                <input
                  type="hidden"
                  id="contest"
                  name="contest"
                  value={contest}
                />
                <fieldset className={widgetStyles.Fields}>
                  {/* TODO: refactor form fields; move FormField into individual field components */}
                  <FormField
                    name="handle"
                    label="Handle"
                    helpText="Handle you're competing under (individual or team name)"
                    isInvalid={hasValidationErrors && !state.handle}
                  >
                    <Widget
                      field={{
                        name: "handle",
                        label: "Handle",
                        helpText:
                          "Handle you're competing under (individual or team name)",
                        widget: "warden",
                        required: true,
                        options: wardens,
                      }}
                      onChange={handleChange}
                      fieldState={state}
                      isInvalid={hasValidationErrors && !state.handle}
                    />
                  </FormField>
                  <FormField
                    name={emailField.name}
                    label={emailField.label}
                    helpText={emailField.helpText}
                    isInvalid={hasValidationErrors && !state.email}
                  >
                    <Widget
                      field={emailField}
                      onChange={handleChange}
                      fieldState={state}
                      isInvalid={hasValidationErrors && !state.email}
                    />
                  </FormField>
                  <FormField
                    name={addressField.name}
                    label={addressField.label}
                    helpText={addressField.helpText}
                    isInvalid={hasValidationErrors && !state.polygonAddress}
                  >
                    <input
                      className={clsx(
                        widgetStyles.Control,
                        widgetStyles.Text,
                        hasValidationErrors &&
                          !state.polygonAddress &&
                          "input-error"
                      )}
                      name={addressField.name}
                      type="text"
                      onChange={handleChange}
                      required={true}
                      value={state.polygonAddress}
                      data-form-type="other"
                    />
                  </FormField>
                  {isQaOrGasFinding && (
                    <div>
                      <p className="warning-message">
                        👋 Hi there! We've changed the way we are handling low
                        risk, non-critical, and gas optimization findings.
                        Please submit all low risk and non critical findings as
                        one report, and gas optimization findings as another,
                        separate report. Submissions for medium and high risk
                        findings are not changing. Check out
                        <a
                          href="https://docs.code4rena.com/roles/wardens/judging-criteria"
                          target="_blank"
                          rel="noreferrer"
                          aria-label="the docs (opens in a new window)"
                        >
                          {" "}
                          the docs
                        </a>{" "}
                        and
                        <a
                          href="https://docs.code4rena.com/roles/wardens/qa-gas-report-faq"
                          target="_blank"
                          rel="noreferrer"
                          aria-label="FAQ about QA and Gas Reports (opens in a new window)"
                        >
                          {" "}
                          FAQ about QA and Gas Reports
                        </a>{" "}
                        for more details.
                      </p>
                    </div>
                  )}
                  <FormField
                    name={riskField.name}
                    label={riskField.label}
                    helpText={riskField.helpText}
                    isInvalid={hasValidationErrors && !state.risk}
                  >
                    <Widget
                      field={riskField}
                      onChange={handleRiskChange}
                      fieldState={state}
                      isInvalid={hasValidationErrors && !state.risk}
                    />
                  </FormField>
                  {state.risk && (
                    <FindingContent
                      hasValidationErrors={hasValidationErrors}
                      state={state}
                      handleChange={handleChange}
                      handleLocChange={handleLocChange}
                      isQaOrGasFinding={isQaOrGasFinding}
                    />
                  )}
                </fieldset>
                <Agreement />

                <button
                  className="button cta-button centered"
                  type="button"
                  onClick={handleSubmit}
                  disabled={status !== FormStatus.Unsubmitted}
                >
                  {status === FormStatus.Unsubmitted
                    ? "Create issue"
                    : "Submitting..."}
                </button>
              </form>
            )}
            {status === FormStatus.Error && (
              <div>
                <p>{errorMessage}</p>
              </div>
            )}
            {status === FormStatus.Submitted && (
              <div className="centered-text">
                <h1>Thank you!</h1>
                <p>Your report has been submitted.</p>
                <button
                  className="button cta-button"
                  type="button"
                  onClick={handleReset}
                >
                  Submit another
                </button>
              </div>
            )}
          </div>
        );
      }}
    />
  );
};

export default Form;
