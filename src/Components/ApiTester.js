import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import DashboardAnalytics from './DashboardAnalytics';


const categorizedApis = {
  SIM: [
    { name: "SIM Info Success", method: "GET", url: "https://jsonplaceholder.typicode.com/posts/1" },
    { name: "SIM Info Fail", method: "GET", url: "https://jsonplaceholder.typicode.com/404" },
  ],
  OTP: [
    { name: "Send OTP", method: "POST", url: "https://jsonplaceholder.typicode.com/posts", body: { phone: "1234567890", message: "Your OTP is 1234" } },
  ],
  Send: [
    { name: "Send Message", method: "POST", url: "https://jsonplaceholder.typicode.com/posts", body: { user: "areej", text: "hello" } },
  ],
  Valid: [
    { name: "Validate Email", method: "GET", url: "https://jsonplaceholder.typicode.com/comments/1" },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState('SIM');
  const [results, setResults] = useState({});
  const [loadingCategory, setLoadingCategory] = useState(null);
  const [allLoading, setAllLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customMethod, setCustomMethod] = useState('GET');
  const [customBody, setCustomBody] = useState('');
  const [customResult, setCustomResult] = useState(null);

  const [mockDescription, setMockDescription] = useState('');
  const [generatedMockUrl, setGeneratedMockUrl] = useState('');
const [mockBodyPreview, setMockBodyPreview] = useState('');
const [mockLoading, setMockLoading] = useState(false);


  const exportToExcel = () => {
    const rows = [];

    Object.entries(results).forEach(([category, apis]) => {
      apis.forEach(api => {
        rows.push({
          Category: category,
          'API Name': api.name,
          Method: categorizedApis[category].find(a => a.name === api.name)?.method || '',
          URL: categorizedApis[category].find(a => a.name === api.name)?.url || '',
          'Status Code': api.status,
          Success: api.success ? 'PASS' : 'FAIL',
          'Response / Error': api.success ? JSON.stringify(api.data) : api.error,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "API Results");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(fileData, 'api-test-results.xlsx');
  };

  const testApisInCategory = async (category) => {
    setLoadingCategory(category);
    const apis = categorizedApis[category];
    const categoryResults = [];

    for (const api of apis) {
      try {
        const res = await axios({
          method: api.method,
          url: api.url,
          data: api.method === 'POST' ? api.body : null,
        });
        categoryResults.push({ name: api.name, status: res.status, success: true, data: res.data });
      } catch (err) {
        categoryResults.push({
          name: api.name,
          status: err.response?.status || 'Error',
          success: false,
          error: err.message,
        });
      }
    }

    setResults(prev => ({ ...prev, [category]: categoryResults }));
    setLoadingCategory(null);
  };

  const testAllCategories = async () => {
    setAllLoading(true);
    for (const category of Object.keys(categorizedApis)) {
      await testApisInCategory(category);
    }
    setAllLoading(false);
  };

 const testCustomApi = async () => {
  let parsedBody = null;

  if (customMethod !== 'GET' && customMethod !== 'DELETE') {
    try {
      parsedBody = customBody ? JSON.parse(customBody) : {};
    } catch (parseError) {
      setCustomResult({
        status: 'Invalid JSON',
        success: false,
        error: `Invalid JSON body: ${parseError.message}`,
      });
      return;
    }
  }

  const tryRequest = async (url) => {
    return axios({
      method: customMethod,
      url,
      data: parsedBody,
    });
  };

  try {
    // First, try original API directly
    const res = await tryRequest(customUrl);
    setCustomResult({ status: res.status, success: true, data: res.data });
  } catch (err) {
    // If CORS/Network error, try again with proxy
    if (err.message.includes('Network Error')) {
      try {
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${customUrl}`;
        const res = await tryRequest(proxyUrl);
        setCustomResult({ status: res.status, success: true, data: res.data });
      } catch (retryErr) {
        setCustomResult({
          status: retryErr.response?.status || 'Error',
          success: false,
          error: retryErr.message,
        });
      }
    } else {
      setCustomResult({
        status: err.response?.status || 'Error',
        success: false,
        error: err.message,
      });
    }
  }
};





const createMockApi = async () => {
  setMockLoading(true);
  try {
    const response = await axios.post('http://localhost:5000/api/generate-mock', {
      description: mockDescription
    });

    const mockJson = response.data;
    setMockBodyPreview(JSON.stringify(mockJson, null, 2));

    // Simulate using it as a mock
    const mockUrl = "http://localhost:5000/api/generate-mock";
    setGeneratedMockUrl(mockUrl);
  } catch (err) {
    alert("❌ Failed to generate mock API");
  }
  setMockLoading(false);
};






  return (
    <div className="api-container dark-theme">
      <h1 className="api-title">API Testing Dashboard</h1>

      <div className="tab-buttons">
        {Object.keys(categorizedApis).map(cat => {
          const categoryPassed = results[cat]?.every(r => r.success);
          const categoryFailed = results[cat]?.some(r => !r.success);
          return (
            <button
              key={cat}
              className={`api-button ${activeTab === cat ? 'active-tab' : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {cat}
              {categoryPassed && <span className="status success">✔</span>}
              {categoryFailed && !categoryPassed && <span className="status error">✖</span>}
            </button>
          );
        })}
        <button onClick={testAllCategories} className="api-button" disabled={allLoading}>
          {allLoading ? 'Testing All...' : 'Test All'}
        </button>

        <button className={`api-button ${activeTab === 'custom' ? 'active-tab' : ''}`} onClick={() => setActiveTab('custom')}>
          Custom API
        </button>
      </div>

<DashboardAnalytics results={results} />

      {activeTab !== 'custom' && (
        <div>
          <button
            className="api-button run-button"
            onClick={() => testApisInCategory(activeTab)}
            disabled={loadingCategory === activeTab || allLoading}
          >
            {loadingCategory === activeTab ? 'Testing...' : `Run ${activeTab}`}
          </button>

          <div className="result-container">
            {results[activeTab]?.map((res, i) => (
              <div key={i} className="result-block">
                <h4>{res.name}</h4>
                <p>Status: <strong>{res.status}</strong></p>
                {res.success ? (
                  <pre className="api-response">{JSON.stringify(res.data, null, 2)}</pre>
                ) : (
                  <p className="api-error">Error: {res.error}</p>
                )}
              </div>
            ))}
            {results[activeTab]?.length > 0 && (
              <button onClick={exportToExcel} className="api-button export-button">
                Export Results to Excel
              </button>
            )}
          </div>
        </div>
      )}

{activeTab === 'custom' && (
  <>
    <div className="custom-api">
      <h2>Test Custom API</h2>
      <input
        type="text"
        placeholder="Enter API URL"
        value={customUrl}
        onChange={e => setCustomUrl(e.target.value)}
        className="input"
      />
      <select value={customMethod} onChange={e => setCustomMethod(e.target.value)} className="input">
        <option value="GET">GET</option>
        <option value="POST">POST</option>
      </select>
      {customMethod === 'POST' && (
        <textarea
          placeholder="Enter JSON body"
          value={customBody}
          onChange={e => setCustomBody(e.target.value)}
          className="input"
          rows={5}
        />
      )}
      <button onClick={testCustomApi} className="api-button run-button">Run Custom Test</button>
      {customResult && (
        <div className="result-block">
          <p>Status: {customResult.status}</p>
          {customResult.success ? (
            <pre className="api-response">{JSON.stringify(customResult.data, null, 2)}</pre>
          ) : (
            <p className="api-error">Error: {customResult.error}</p>
          )}
        </div>
      )}
    </div>

    {/* ✅ This is now safely inside the fragment */}
    <div className="mock-api-generator">
      <h2>🛠️ Generate Mock API</h2>
      <textarea
        placeholder="Describe your mock API (e.g., 'User creation with name and email')"
        value={mockDescription}
        onChange={(e) => setMockDescription(e.target.value)}
        className="input"
        rows={3}
      />
      <button
        onClick={createMockApi}
        className="api-button run-button"
        disabled={mockLoading || !mockDescription}
      >
        {mockLoading ? 'Generating...' : 'Create Mock API'}
      </button>

      {generatedMockUrl && (
        <div className="mock-result">
          <p><strong>Mock URL:</strong> <a href={generatedMockUrl} target="_blank" rel="noreferrer">{generatedMockUrl}</a></p>
          <p><strong>Preview:</strong></p>
          <pre className="api-response">{mockBodyPreview}</pre>
          <button
            onClick={() => {
              setCustomUrl(generatedMockUrl);
              setCustomMethod('GET');
              setCustomBody('');
              alert('Mock API copied to Custom API tester.');
            }}
            className="api-button export-button"
          >
            Use in Custom API Tester
          </button>
        </div>
      )}
    </div>
  </>
)}
    </div>
  );
}
