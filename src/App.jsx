import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingDown, DollarSign, Shield, Eye, EyeOff, Globe } from 'lucide-react';
import { fetchBybitPositions } from './bybitAPI';

const BybitRiskDashboard = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [maxLoss, setMaxLoss] = useState(1000);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [totalRiskExposure, setTotalRiskExposure] = useState(0);
  const [environment, setEnvironment] = useState('testnet');

  // Load saved API keys on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('bybit_api_key');
    const savedApiSecret = localStorage.getItem('bybit_api_secret');
    const savedMaxLoss = localStorage.getItem('bybit_max_loss');
    const savedEnvironment = localStorage.getItem('bybit_environment');
    
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedApiSecret) setApiSecret(savedApiSecret);
    if (savedMaxLoss) setMaxLoss(parseFloat(savedMaxLoss));
    if (savedEnvironment) setEnvironment(savedEnvironment);
  }, []);

  // Save API keys locally
  const saveApiKeys = () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('Please enter both API key and secret');
      return;
    }
    
    localStorage.setItem('bybit_api_key', apiKey);
    localStorage.setItem('bybit_api_secret', apiSecret);
    localStorage.setItem('bybit_max_loss', maxLoss.toString());
    localStorage.setItem('bybit_environment', environment);
    setError('');
    alert('API keys saved successfully!');
  };

  const fetchPositions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await fetchBybitPositions(apiKey, apiSecret, environment);
      
      if (result.success) {
        // Calculate risk exposure for each position
        const positionsWithRisk = result.positions.map(position => {
          const currentPrice = parseFloat(position.markPrice);
          const stopLoss = parseFloat(position.stopLoss);
          const size = parseFloat(position.size);
          
          let riskExposure = 0;
          if (position.side === 'Buy') {
            riskExposure = (currentPrice - stopLoss) * size;
          } else {
            riskExposure = (stopLoss - currentPrice) * size;
          }
          
          return {
            ...position,
            riskExposure: Math.max(0, riskExposure)
          };
        });
        
        setPositions(positionsWithRisk);
        
        // Calculate total risk exposure
        const total = positionsWithRisk.reduce((sum, pos) => sum + pos.riskExposure, 0);
        setTotalRiskExposure(total);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch positions. Please check your API credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Get environment info for display
  const getEnvironmentInfo = () => {
    switch (environment) {
      case 'testnet':
        return { name: 'Testnet', color: 'blue', url: 'api-testnet.bybit.com', desc: 'Safe testing environment' };
      case 'demo':
        return { name: 'Demo', color: 'green', url: 'api-demo.bybit.com', desc: 'Demo trading environment' };
      case 'mainnet':
        return { name: 'Mainnet', color: 'red', url: 'api.bybit.com', desc: 'Live trading environment' };
      case 'mainnet-alt':
        return { name: 'Mainnet Alt', color: 'orange', url: 'api.bytick.com', desc: 'Alternative live endpoint' };
      default:
        return { name: 'Testnet', color: 'blue', url: 'api-testnet.bybit.com', desc: 'Safe testing environment' };
    }
  };

  const envInfo = getEnvironmentInfo();

  // Calculate risk percentage for progress bar
  const riskPercentage = Math.min((totalRiskExposure / maxLoss) * 100, 100);
  
  // Determine progress bar color
  const getProgressBarColor = () => {
    if (riskPercentage <= 30) return 'bg-gradient-to-r from-green-400 to-green-600';
    if (riskPercentage <= 60) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (riskPercentage <= 80) return 'bg-gradient-to-r from-orange-400 to-orange-600';
    return 'bg-gradient-to-r from-red-400 to-red-600';
  };

  // Get environment button styles
  const getEnvButtonStyles = (envKey, envColor) => {
    const isSelected = environment === envKey;
    const baseStyles = "p-4 rounded-lg border-2 transition-all duration-200 text-center";
    
    if (isSelected) {
      return `${baseStyles} border-${envColor}-500 bg-${envColor}-50 shadow-md ring-2 ring-${envColor}-200`;
    }
    return `${baseStyles} border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
              <Shield className="text-blue-600" size={40} />
              Bybit Risk Exposure Dashboard
            </h1>
            <p className="text-gray-600 text-lg">Monitor your trading positions and risk exposure in real-time</p>
            
            {/* Environment Indicator */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                envInfo.color === 'blue' ? 'bg-blue-500' :
                envInfo.color === 'green' ? 'bg-green-500' :
                envInfo.color === 'red' ? 'bg-red-500' : 'bg-orange-500'
              }`}></div>
              <span className={`text-sm font-semibold ${
                envInfo.color === 'blue' ? 'text-blue-600' :
                envInfo.color === 'green' ? 'text-green-600' :
                envInfo.color === 'red' ? 'text-red-600' : 'text-orange-600'
              }`}>
                {envInfo.name} Environment
              </span>
              <span className="text-xs text-gray-500">({envInfo.url})</span>
            </div>
          </div>

          {/* Environment Selection */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Globe className="text-white" size={18} />
              </div>
              Environment Selection
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'testnet', name: 'Testnet', desc: 'Safe testing', color: 'blue' },
                { key: 'demo', name: 'Demo', desc: 'Demo trading', color: 'green' },
                { key: 'mainnet', name: 'Mainnet', desc: 'Live trading', color: 'red' },
                { key: 'mainnet-alt', name: 'Mainnet Alt', desc: 'Live trading (alt)', color: 'orange' }
              ].map((env) => (
                <button
                  key={env.key}
                  onClick={() => setEnvironment(env.key)}
                  className={getEnvButtonStyles(env.key, env.color)}
                >
                  <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                    env.color === 'blue' ? 'bg-blue-500' :
                    env.color === 'green' ? 'bg-green-500' :
                    env.color === 'red' ? 'bg-red-500' : 'bg-orange-500'
                  }`}></div>
                  <div className={`font-semibold text-sm ${
                    environment === env.key ? (
                      env.color === 'blue' ? 'text-blue-700' :
                      env.color === 'green' ? 'text-green-700' :
                      env.color === 'red' ? 'text-red-700' : 'text-orange-700'
                    ) : 'text-gray-700'
                  }`}>
                    {env.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{env.desc}</div>
                </button>
              ))}
            </div>
          </div>
        
          {/* API Configuration Section */}
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Shield className="text-white" size={18} />
                </div>
                API Configuration
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type={showSecrets ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Enter your Bybit API key"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    API Secret
                  </label>
                  <input
                    type={showSecrets ? "text" : "password"}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Enter your Bybit API secret"
                  />
                </div>
                
                <button
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showSecrets ? 'Hide' : 'Show'} API credentials
                </button>
                
                <button
                  onClick={saveApiKeys}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Save API Keys
                </button>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <TrendingDown className="text-white" size={18} />
                </div>
                Risk Settings
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Maximum Tolerable Loss (USD)
                  </label>
                  <input
                    type="number"
                    value={maxLoss}
                    onChange={(e) => setMaxLoss(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="1000"
                    min="0"
                    step="100"
                  />
                </div>
                
                <button
                  onClick={fetchPositions}
                  disabled={loading || !apiKey || !apiSecret}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Loading...
                    </span>
                  ) : (
                    'Fetch Positions'
                  )}
                </button>
              </div>
            </div>
          </div>
        
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-center gap-3 shadow-sm">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="text-red-500" size={18} />
              </div>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          )}
        </div>
      
        {/* Risk Overview */}
        {positions.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="text-white" size={24} />
              </div>
              Risk Exposure Overview
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 bg-red-500 rounded-lg"></div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Risk Exposure</div>
                </div>
                <div className="text-3xl font-bold text-red-600">${totalRiskExposure.toFixed(2)}</div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-lg"></div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Maximum Tolerable Loss</div>
                </div>
                <div className="text-3xl font-bold text-blue-600">${maxLoss.toFixed(2)}</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 bg-orange-500 rounded-lg"></div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Risk Utilization</div>
                </div>
                <div className="text-3xl font-bold text-orange-600">{riskPercentage.toFixed(1)}%</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-700">Risk Level</span>
                <span className="text-lg font-bold text-gray-800">{riskPercentage.toFixed(1)}% of max loss</span>
              </div>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-6 shadow-inner">
                  <div
                    className={`h-6 rounded-full transition-all duration-1000 ease-out shadow-sm ${getProgressBarColor()}`}
                    style={{ width: `${Math.min(riskPercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white drop-shadow-sm">
                    {riskPercentage > 10 ? `${riskPercentage.toFixed(1)}%` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      
        {/* Positions Table */}
        {positions.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <DollarSign className="text-white" size={24} />
              </div>
              Active Positions
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="text-left py-4 px-6 font-bold text-gray-700 uppercase tracking-wide text-sm">Symbol</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700 uppercase tracking-wide text-sm">Side</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700 uppercase tracking-wide text-sm">Size</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700 uppercase tracking-wide text-sm">Entry Price</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700 uppercase tracking-wide text-sm">Mark Price</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700 uppercase tracking-wide text-sm">Stop Loss</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700 uppercase tracking-wide text-sm">Unrealized PnL</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700 uppercase tracking-wide text-sm">Risk Exposure</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-200">
                      <td className="py-4 px-6 font-bold text-gray-800 text-lg">{position.symbol}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold shadow-sm ${
                          position.side === 'Buy' 
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                            : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                        }`}>
                          {position.side}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-700 font-medium">{position.size}</td>
                      <td className="py-4 px-6 text-gray-700 font-medium">${position.entryPrice}</td>
                      <td className="py-4 px-6 text-gray-700 font-medium">${position.markPrice}</td>
                      <td className="py-4 px-6 text-gray-700 font-medium">${position.stopLoss}</td>
                      <td className="py-4 px-6">
                        <span className={`font-bold text-lg ${
                          parseFloat(position.unrealizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${position.unrealizedPnl}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-lg text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200">
                          ${position.riskExposure.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      
        {loading && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 text-center">
            <div className="inline-block relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <p className="mt-6 text-gray-600 text-lg font-medium">Fetching your positions...</p>
            <p className="mt-2 text-gray-500">This may take a few moments</p>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <>
      <BybitRiskDashboard />
    </>
  );
}

export default App;
