import React, { useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

export default function DashboardAnalytics({ results }) {
  const chartRef = useRef();

  // Summarize pass/fail counts by category
  const totalCounts = useMemo(() => {
    return Object.entries(results).map(([category, apis]) => {
      const pass = apis.filter((r) => r.success).length;
      const fail = apis.length - pass;
      return { category, pass, fail };
    });
  }, [results]);

  // Flatten all APIs for detailed table
  const allApis = useMemo(() => {
    let list = [];
    Object.entries(results).forEach(([category, apis]) => {
      apis.forEach((api) => {
        list.push({
          category,
          name: api.name,
          status: api.status,
          success: api.success,
          error: api.error || '',
          dataSnippet: api.success
            ? JSON.stringify(api.data).slice(0, 50) +
              (JSON.stringify(api.data).length > 50 ? '...' : '')
            : '',
        });
      });
    });
    return list;
  }, [results]);

  const data = {
    labels: totalCounts.map((d) => d.category),
    datasets: [
      {
        label: 'Pass',
        backgroundColor: '#4ade80',
        data: totalCounts.map((d) => d.pass),
      },
      {
        label: 'Fail',
        backgroundColor: '#f87171',
        data: totalCounts.map((d) => d.fail),
      },
    ],
  };

  const options = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#fff' } },
    },
    scales: {
      x: { ticks: { color: '#fff' } },
      y: { ticks: { color: '#fff' } },
    },
  };

  const downloadPDF = async () => {
    try {
      // Capture chart canvas directly
      const chartCanvas = chartRef.current.canvas;
      const chartImg = chartCanvas.toDataURL('image/png');

      // Create hidden table container clone for screenshot
      const tableContainer = document.createElement('div');
      tableContainer.style.width = '800px';
      tableContainer.style.padding = '10px';
      tableContainer.style.background = '#1e1e2f';
      tableContainer.style.color = '#fff';
      tableContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
      tableContainer.innerHTML = `
        <h3 style="color: white; margin-bottom: 10px;">API Test Results (Detailed)</h3>
        ${document.querySelector('.analytics-table-container').innerHTML}
      `;
      document.body.appendChild(tableContainer);

      // Capture the table as image
      const tableCanvas = await html2canvas(tableContainer);
      const tableImg = tableCanvas.toDataURL('image/png');
      document.body.removeChild(tableContainer); // clean up

      // Create PDF and add chart image
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFontSize(18);
      pdf.setTextColor(33, 33, 33);
      pdf.text('API Test Analytics Report', 10, 15);

      pdf.addImage(chartImg, 'PNG', 10, 20, 190, 90);

      // Add new page and table image
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('API Test Results (Detailed)', 10, 15);
      pdf.addImage(tableImg, 'PNG', 10, 20, 190, 260);

      pdf.save('api-test-report.pdf');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Error generating PDF. See console for details.');
    }
  };

  if (!totalCounts.length) return null;

  return (
    <div className="analytics-section">
      <h3>API Test Analytics</h3>

      <div
        style={{ width: 600, height: 300 }}
      >
        <Bar
          ref={chartRef}
          data={data}
          options={options}
          width={600}
          height={300}
        />
      </div>

      <div className="analytics-table-container">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>API Name</th>
              <th>Status Code</th>
              <th>Result</th>
              <th>Error / Response Snippet</th>
            </tr>
          </thead>
          <tbody>
            {allApis.length === 0 ? (
              <tr>
                <td colSpan={5} className="center" style={{ padding: '12px' }}>
                  No API results yet
                </td>
              </tr>
            ) : (
              allApis.map((api, i) => (
                <tr key={i} className={api.success ? 'result-pass' : 'result-fail'}>
                  <td>{api.category}</td>
                  <td>{api.name}</td>
                  <td className="center">{api.status}</td>
                  <td className="center">{api.success ? 'PASS' : 'FAIL'}</td>
                  <td className="snippet">{api.success ? api.dataSnippet : api.error}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={downloadPDF}
        className="api-button export-button"
        style={{ marginTop: 15, alignSelf: 'flex-start' }}
      >
        Download PDF Report
      </button>
    </div>
  );
}
