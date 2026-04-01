import React, { useState, useEffect, useRef } from 'react';
import { Network, Shield, Cpu, Activity, Terminal as TerminalIcon, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ipaddr from 'ipaddr.js';

const App = () => {
  const [octets, setOctets] = useState(['', '', '', '']);
  const [cidr, setCidr] = useState('24');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef()];


  const handleOctetChange = (index, value) => {
    // Only allow numbers and max length of 3
    const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 3);

    // Validate range 0-255
    if (cleanValue !== '' && parseInt(cleanValue) > 255) return;

    const newOctets = [...octets];
    newOctets[index] = cleanValue;
    setOctets(newOctets);

    // Auto-focus next box if 3 digits or if user typed a period (handled in onKeyDown)
    if (cleanValue.length === 3 && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to next box on period
    if (e.key === '.' && index < 3) {
      e.preventDefault();
      inputRefs[index + 1].current.focus();
    }
    // Move to next box on slash (for CIDR)
    if (e.key === '/' && index === 3) {
      e.preventDefault();
      inputRefs[4].current.focus();
    }
    // Backspace to previous box if empty
    if (e.key === 'Backspace' && octets[index] === '' && index > 0) {
      inputRefs[index - 1].current.focus();
    }
    // Calculate on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      calculateSubnet();
    }
  };

  const handleCidrChange = (value) => {
    const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 2);
    if (cleanValue !== '' && parseInt(cleanValue) > 32) return;
    setCidr(cleanValue);
  };

  const calculateSubnet = () => {
    try {
      const ipString = octets.join('.');
      if (octets.some(o => o === '') || cidr === '') {
        setResults(null);
        setError('');
        return;
      }

      if (!ipaddr.isValid(ipString)) {
        setError('INVALID IP CONFIGURATION');
        setResults(null);
        return;
      }

      const ip = ipaddr.parse(ipString);
      const prefix = parseInt(cidr);

      const network = ipaddr.IPv4.networkAddressFromCIDR(`${ipString}/${prefix}`);
      const broadcast = ipaddr.IPv4.broadcastAddressFromCIDR(`${ipString}/${prefix}`);

      const maskStr = ipaddr.IPv4.subnetMaskFromPrefixLength(prefix).toString();

      // Calculate total hosts
      // Formula: 2^(32-n) - 2 (except for /31 and /32)
      let totalHosts = 0;
      let firstUsable = '';
      let lastUsable = '';

      if (prefix === 32) {
        totalHosts = 1;
        firstUsable = network.toString();
        lastUsable = network.toString();
      } else if (prefix === 31) {
        totalHosts = 2;
        firstUsable = network.toString();
        lastUsable = broadcast.toString();
      } else {
        totalHosts = Math.pow(2, 32 - prefix) - 2;

        const netBytes = network.toByteArray();
        const broadBytes = broadcast.toByteArray();

        const firstBytes = [...netBytes];
        firstBytes[3] += 1;
        firstUsable = firstBytes.join('.');

        const lastBytes = [...broadBytes];
        lastBytes[3] -= 1;
        lastUsable = lastBytes.join('.');
      }

      setResults({
        network: network.toString(),
        broadcast: broadcast.toString(),
        mask: maskStr,
        range: `${firstUsable} — ${lastUsable}`,
        totalHosts: totalHosts.toLocaleString(),
        cidr: `/${prefix}`
      });
      setError('');
    } catch (err) {
      setError('CALCULATION ERROR');
      setResults(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 selection:bg-matrix-green selection:text-matrix-dark">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl z-10"
      >
        <header className="mb-8 text-center">
          <div className="inline-block p-3 rounded-full bg-matrix-green/10 mb-4 border border-matrix-green/30 animate-pulse">
            <Network className="w-8 h-8 text-matrix-green" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tighter">
            SUBNET<span className="text-white">_</span>CALCULATOR
          </h1>
          <p className="text-matrix-green/60 text-sm md:text-base font-mono">
            v2.0.4 // SYSTEM PROTOCOL: IPv4
          </p>
        </header>

        <section className="glass-card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* IP Input */}
            <div>
              <label className="terminal-label flex items-center gap-2">
                <Cpu className="w-3 h-3" /> Source Address
              </label>
              <div className="flex items-end gap-2 text-2xl">
                {octets.map((octet, index) => (
                  <React.Fragment key={index}>
                    <input
                      ref={inputRefs[index]}
                      type="text"
                      value={octet}
                      onChange={(e) => handleOctetChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      placeholder="000"
                      className="terminal-input w-full"
                    />
                    {index < 3 && <span className="pb-1 text-matrix-green/30">.</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* CIDR Input */}
            <div>
              <label className="terminal-label flex items-center gap-2">
                <Shield className="w-3 h-3" /> Prefix Length
              </label>
              <div className="flex items-end gap-2 text-2xl">
                <span className="pb-1 text-matrix-green/30">/</span>
                <input
                  ref={inputRefs[4]}
                  type="text"
                  value={cidr}
                  onChange={(e) => handleCidrChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      calculateSubnet();
                    }
                  }}
                  className="terminal-input w-16 text-left"
                />
                <span className="text-sm text-matrix-green/40 ml-auto font-mono self-center">
                  (0-32)
                </span>
              </div>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-3 border border-red-500/50 bg-red-500/10 text-red-500 text-xs md:text-sm font-mono text-center flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4 animate-bounce" />
              ERROR: {error}
            </motion.div>
          )}
        </section>

        <AnimatePresence mode="wait">
          {results ? (
            <motion.section
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-matrix-green/20">
                <motion.div
                  className="h-full bg-matrix-green shadow-[0_0_10px_#00FF41]"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1 }}
                />
              </div>

              <div className="flex items-center gap-3 mb-6 border-b border-matrix-green/10 pb-4">
                <TerminalIcon className="w-5 h-5 text-matrix-green" />
                <h2 className="text-xl uppercase tracking-widest">Protocol Output</h2>
                <div className="ml-auto flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-matrix-green/20"></div>
                  <div className="w-2 h-2 rounded-full bg-matrix-green/40"></div>
                  <div className="w-2 h-2 rounded-full bg-matrix-green"></div>
                </div>
              </div>

              <div className="space-y-4 font-mono text-sm md:text-base">
                <ResultItem label="Network Address" value={results.network} icon="→" />
                <ResultItem label="Broadcast Address" value={results.broadcast} icon="←" />
                <ResultItem label="Subnet Mask" value={results.mask} icon="▒" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-matrix-green/10 mt-4">
                  <div>
                    <span className="terminal-label">Host Range</span>
                    <div className="text-matrix-green">{results.range}</div>
                  </div>
                  <div>
                    <span className="terminal-label">Total Usable Hosts</span>
                    <div className="text-white flex items-center gap-2">
                      {results.totalHosts}
                      <span className="text-[10px] text-matrix-green/40 uppercase tracking-tighter">Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center text-[10px] uppercase text-matrix-green/30 tracking-[0.2em]">
                <div>Checksum: {Math.random().toString(36).substring(7).toUpperCase()}</div>
                <div>Status: Encrypted_Session</div>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card flex flex-col items-center justify-center py-12 text-matrix-green/30"
            >
              <Info className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-mono text-sm uppercase tracking-widest animate-pulse">
                Awaiting Input Sequence...
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        <footer className="mt-12 text-center text-matrix-green/20 text-xs font-mono uppercase tracking-[0.3em]">
          &copy; 2026 // BELLAOUD ELMEHDI
        </footer>
      </motion.div>
    </div>
  );
};

const ResultItem = ({ label, value, icon }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between group">
    <span className="text-matrix-green/50 flex items-center gap-2">
      <span className="text-matrix-green">{icon}</span> {label}
    </span>
    <motion.span
      initial={{ x: 10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="text-white group-hover:text-matrix-green transition-colors"
    >
      {value}
    </motion.span>
  </div>
);

export default App;
