import React, { useState } from 'react';
import { Terminal, Code, Check } from 'lucide-react';
import { ScanResultResponse } from '../../api/types';

interface ApiResponseViewerProps {
  result: ScanResultResponse;
}

export const ApiResponseViewer: React.FC<ApiResponseViewerProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<'response' | 'curl' | 'python' | 'node'>('response');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCurlSnippet = () => {
    return `curl -X POST https://api.pramaansetu.in/v1/verify \\
  -H "Authorization: Bearer $PRAMAANSETU_API_KEY" \\
  -F "document_type=${result.document_type}" \\
  -F "document_image=@/path/to/document.jpg"`;
  };

  const getPythonSnippet = () => {
    return `import requests
import os

url = "https://api.pramaansetu.in/v1/verify"
headers = {
    "Authorization": f"Bearer {os.environ.get('PRAMAANSETU_API_KEY')}"
}
files = {
    "document_image": open("/path/to/document.jpg", "rb")
}
data = {
    "document_type": "${result.document_type}"
}

response = requests.post(url, headers=headers, files=files, data=data)
print(response.json())`;
  };

  const getNodeSnippet = () => {
    return `const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const form = new FormData();
form.append('document_type', '${result.document_type}');
form.append('document_image', fs.createReadStream('/path/to/document.jpg'));

fetch('https://api.pramaansetu.in/v1/verify', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.PRAMAANSETU_API_KEY}\`,
    ...form.getHeaders()
  },
  body: form
})
.then(res => res.json())
.then(json => console.log(json));`;
  };

  const getContent = () => {
    switch (activeTab) {
      case 'response':
        return JSON.stringify(result, null, 2);
      case 'curl':
        return getCurlSnippet();
      case 'python':
        return getPythonSnippet();
      case 'node':
        return getNodeSnippet();
      default:
        return '';
    }
  };

  const content = getContent();

  return (
    <div className="bg-stone-900 rounded-lg overflow-hidden border border-stone-800 shadow-sm font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-stone-950 border-b border-stone-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('response')}
            className={`py-1 flex items-center gap-1.5 transition-colors ${
              activeTab === 'response' ? 'text-emerald-400 font-medium' : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            <Code size={14} />
            Response
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`py-1 flex items-center gap-1.5 transition-colors ${
              activeTab === 'curl' ? 'text-emerald-400 font-medium' : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            <Terminal size={14} />
            cURL
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`py-1 flex items-center gap-1.5 transition-colors ${
              activeTab === 'python' ? 'text-emerald-400 font-medium' : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            Python
          </button>
          <button
            onClick={() => setActiveTab('node')}
            className={`py-1 flex items-center gap-1.5 transition-colors ${
              activeTab === 'node' ? 'text-emerald-400 font-medium' : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            Node.js
          </button>
        </div>
        <button
          onClick={() => copyToClipboard(content)}
          className="text-stone-400 hover:text-white transition-colors p-1"
          title="Copy code"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>}
        </button>
      </div>
      <div className="p-4 overflow-x-auto bg-stone-900 text-stone-300">
        <pre>
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
};
