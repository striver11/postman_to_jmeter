import { promises as fs } from "fs";
import { join } from "path";
import { sanitizeFileName, replaceVariables, escapeXml, isValidUrl } from "./utils.js";

let variables = {};
let itemCounter = 0;
let convertedScripts = new Map();

async function createJMeterTestPlan(collection, outputDir) {
  const testPlanTemplate = `
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="${escapeXml(collection.info.name)}">
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables">
        <collectionProp name="Arguments.arguments">
          <elementProp name="url" elementType="Argument">
            <stringProp name="Argument.name">url</stringProp>
            <stringProp name="Argument.value">${variables.url}</stringProp>
            <stringProp name="Argument.metadata">=</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Thread Group">
        <intProp name="ThreadGroup.num_threads">1</intProp>
        <intProp name="ThreadGroup.ramp_time">1</intProp>
        <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller">
          <stringProp name="LoopController.loops">1</stringProp>
          <boolProp name="LoopController.continue_forever">false</boolProp>
        </elementProp>
      </ThreadGroup>
      <hashTree>
        <!-- Replace this section with dynamically generated HTTPSamplerProxy elements -->
        ${await generateJMeterSamplers(collection.item, outputDir)}
       <ResultCollector guiclass="ViewResultsFullVisualizer" testclass="ResultCollector" testname="View Results Tree">
          <boolProp name="ResultCollector.error_logging">false</boolProp>
          <objProp>
            <name>saveConfig</name>
            <value class="SampleSaveConfiguration">
              <time>true</time>
              <latency>true</latency>
              <timestamp>true</timestamp>
              <success>true</success>
              <label>true</label>
              <code>true</code>
              <message>true</message>
              <threadName>true</threadName>
              <dataType>true</dataType>
              <encoding>false</encoding>
              <assertions>true</assertions>
              <subresults>true</subresults>
              <responseData>false</responseData>
              <samplerData>false</samplerData>
              <xml>false</xml>
              <fieldNames>true</fieldNames>
              <responseHeaders>false</responseHeaders>
              <requestHeaders>false</requestHeaders>
              <responseDataOnError>false</responseDataOnError>
              <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
              <assertionsResultsToSave>0</assertionsResultsToSave>
              <bytes>true</bytes>
              <sentBytes>true</sentBytes>
              <url>true</url>
              <threadCounts>true</threadCounts>
              <idleTime>true</idleTime>
              <connectTime>true</connectTime>
            </value>
          </objProp>
          <stringProp name="filename"></stringProp>
        </ResultCollector>
        <hashTree/>
        <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report">
          <boolProp name="ResultCollector.error_logging">false</boolProp>
          <objProp>
            <name>saveConfig</name>
            <value class="SampleSaveConfiguration">
              <time>true</time>
              <latency>true</latency>
              <timestamp>true</timestamp>
              <success>true</success>
              <label>true</label>
              <code>true</code>
              <message>true</message>
              <threadName>true</threadName>
              <dataType>true</dataType>
              <encoding>false</encoding>
              <assertions>true</assertions>
              <subresults>true</subresults>
              <responseData>false</responseData>
              <samplerData>false</samplerData>
              <xml>false</xml>
              <fieldNames>true</fieldNames>
              <responseHeaders>false</responseHeaders>
              <requestHeaders>false</requestHeaders>
              <responseDataOnError>false</responseDataOnError>
              <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
              <assertionsResultsToSave>0</assertionsResultsToSave>
              <bytes>true</bytes>
              <sentBytes>true</sentBytes>
              <url>true</url>
              <threadCounts>true</threadCounts>
              <idleTime>true</idleTime>
              <connectTime>true</connectTime>
            </value>
          </objProp>
          <stringProp name="filename"></stringProp>
        </ResultCollector>
        <hashTree/>
        <ResultCollector guiclass="TableVisualizer" testclass="ResultCollector" testname="View Results in Table">
          <boolProp name="ResultCollector.error_logging">false</boolProp>
          <objProp>
            <name>saveConfig</name>
            <value class="SampleSaveConfiguration">
              <time>true</time>
              <latency>true</latency>
              <timestamp>true</timestamp>
              <success>true</success>
              <label>true</label>
              <code>true</code>
              <message>true</message>
              <threadName>true</threadName>
              <dataType>true</dataType>
              <encoding>false</encoding>
              <assertions>true</assertions>
              <subresults>true</subresults>
              <responseData>false</responseData>
              <samplerData>false</samplerData>
              <xml>false</xml>
              <fieldNames>true</fieldNames>
              <responseHeaders>false</responseHeaders>
              <requestHeaders>false</requestHeaders>
              <responseDataOnError>false</responseDataOnError>
              <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
              <assertionsResultsToSave>0</assertionsResultsToSave>
              <bytes>true</bytes>
              <sentBytes>true</sentBytes>
              <url>true</url>
              <threadCounts>true</threadCounts>
              <idleTime>true</idleTime>
              <connectTime>true</connectTime>
            </value>
          </objProp>
          <stringProp name="filename"></stringProp>
        </ResultCollector>
        <hashTree/>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
`;

  const outputFilePath = join(outputDir, "testPlan.jmx");
  await fs.writeFile(outputFilePath, testPlanTemplate, "utf8");
}

async function generateJMeterSamplers(items, outputDir) {
  let samplers = "";
  for (const item of items) {
    samplers += await processItem(item, outputDir);
  }
  return samplers;
}

async function processItem(item, outputDir) {
  if (item.item) {
    // Folder containing sub-items
    let samplers = "";
    for (const subItem of item.item) {
      samplers += await processItem(subItem, outputDir);
    }
    return samplers;
  } else if (item.request) {
    // Single request item
    const { name, request, event } = item;
    const { method, url, header, body } = request;

    // Ensure URL is valid before proceeding
    if (!isValidUrl(url.raw)) {
      console.warn(`Skipping invalid URL for request: ${name}`);
      return "";
    }
   
   
    console.log(url)
   
    // <stringProp name="HTTPSampler.path">${escapeXml(url.path.join('/'))}</stringProp>
    //  <stringProp name="HTTPSampler.path">/${url.path[1]}/${url.variable[0].value}</stringProp>
    let jmeterSampler = `
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${escapeXml(name)}">
          <stringProp name="HTTPSampler.domain">$${url.host[0].slice(1,-1)}</stringProp>
          <stringProp name="HTTPSampler.protocol">${url.protocol}</stringProp>
          <stringProp name="HTTPSampler.path">${escapeXml(url.path.join('/'))}</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <stringProp name="HTTPSampler.method">${method}</stringProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
          <boolProp name="HTTPSampler.postBodyRaw">${body?.mode === "raw"}</boolProp>
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            <collectionProp name="Arguments.arguments">
              ${body?.mode === "raw" ? `
              <elementProp name="" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">${escapeXml(replaceVariables(body.raw, variables))}</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>` : ""}
            </collectionProp>
          </elementProp>
        </HTTPSamplerProxy>
        <hashTree>
          ${generateAssertions(event)}
        </hashTree>`;

    return jmeterSampler;
  }
}

function generateAssertions(event) {
  let assertions = "";
  const testEvent = event?.find(e => e.listen === "test");
  if (testEvent) {
    const script = testEvent.script.exec.join("\n");

    if (script.includes("pm.response.to.have.status")) {
      const statusMatch = script.match(/pm\.response\.to\.have\.status\((\d+)\)/);
      if (statusMatch) {
        assertions += `
        <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Response Assertion">
          <collectionProp name="Asserion.test_strings">
            <stringProp name="49586">${statusMatch[1]}</stringProp>
          </collectionProp>
          <stringProp name="Assertion.custom_message"></stringProp>
          <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
          <boolProp name="Assertion.assume_success">false</boolProp>
          <intProp name="Assertion.test_type">8</intProp>
        </ResponseAssertion>
        <hashTree/>`;
      }
    }

    const jsonPathAssertions = [...script.matchAll(/pm\.expect\((.*?)\)\.to\.equal\((.*?)\)/g)];
    jsonPathAssertions.forEach(match => {
      const jsonPath = match[1].replace(/\bresponse(?:\[(\d+)\])?\.(\w+)/g, (_, index, property) => {
        return `$${index ? `[${index}]` : ""}.${property}`;
      });
         
      const expectedValue = match[2].replace(/"/g, '');
      assertions += `
        <JSONPathAssertion guiclass="JSONPathAssertionGui" testclass="JSONPathAssertion" testname="JSONPath Assertion">
          <stringProp name="JSON_PATH">${jsonPath}</stringProp>
          <stringProp name="EXPECTED_VALUE">${expectedValue}</stringProp>
          <boolProp name="JSONVALIDATION">true</boolProp>
          <boolProp name="EXPECT_NULL">false</boolProp>
          <boolProp name="INVERT">false</boolProp>
          <boolProp name="ISREGEX">true</boolProp>
        </JSONPathAssertion>
        <hashTree/>`;
    });
  }
  return assertions;
}

export async function processCollection(collection, outputDir) {
  variables = collection.variable.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {});
  await createJMeterTestPlan(collection, outputDir);
}
