import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, formatEther, parseEther } from 'viem';
import { hardhat } from 'viem/chains';
import LottoABI from './abi.json';

// NOTE: Update this address after deploying to your local node!
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 

interface Lottery {
  id: bigint;
  owner: string;
  ticketPrice: bigint;
  endTime: bigint;
  playerCount: bigint;
  winnerPicked: boolean;
  winner: string;
  prizeAmount: bigint;
  yieldGenerated: bigint;
  currentYieldEstimate: bigint;
}

function App() {
  const [account, setAccount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'dashboard'>('browse');
  
  // Data
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [myCreatedIds, setMyCreatedIds] = useState<bigint[]>([]);
  const [myJoinedIds, setMyJoinedIds] = useState<bigint[]>([]);
  
  // Form State
  const [newTicketPrice, setNewTicketPrice] = useState("1");
  const [newDuration, setNewDuration] = useState("60"); // seconds

  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");

  const publicClient = createPublicClient({
    chain: hardhat,
    transport: custom(window.ethereum!)
  });

  const walletClient = createWalletClient({
    chain: hardhat,
    transport: custom(window.ethereum!)
  });

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install a wallet like Core or MetaMask!");
      return;
    }
    try {
      const [address] = await walletClient.requestAddresses();
      setAccount(address);
    } catch (error) {
      console.error(error);
      setStatus("Failed to connect wallet.");
    }
  };

  const fetchLotteries = async () => {
    if (!publicClient || !CONTRACT_ADDRESS) return;
    try {
      // 1. Get total count
      const count = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'getLotteryCount',
      }) as bigint;

      // 2. Fetch all lotteries (reverse order to show newest first)
      const fetchedLotteries: Lottery[] = [];
      for (let i = Number(count) - 1; i >= 0; i--) {
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: LottoABI,
          functionName: 'getLottery',
          args: [BigInt(i)]
        }) as any;
        
        fetchedLotteries.push({
          id: data[0],
          owner: data[1],
          ticketPrice: data[2],
          endTime: data[3],
          playerCount: data[4],
          winnerPicked: data[5],
          winner: data[6],
          prizeAmount: data[7],
          yieldGenerated: data[8],
          currentYieldEstimate: data[9]
        });
      }
      setLotteries(fetchedLotteries);

      // 3. Fetch User specific data if connected
      if (account) {
        const created = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: LottoABI,
          functionName: 'getCreatorLotteries',
          args: [account]
        }) as bigint[];
        setMyCreatedIds(created || []);

        const joined = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: LottoABI,
          functionName: 'getPlayerLotteries',
          args: [account]
        }) as bigint[];
        setMyJoinedIds(joined || []);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    if (account) {
      fetchLotteries();
      const interval = setInterval(fetchLotteries, 5000);
      return () => clearInterval(interval);
    }
  }, [account]);

  const createLottery = async () => {
    if (!account) return;
    setLoading(true);
    setStatus("Creating lottery...");
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'createLottery',
        args: [parseEther(newTicketPrice), BigInt(newDuration)],
        account: account as `0x${string}`,
        chain: hardhat
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Lottery Created!");
      setActiveTab('browse');
      fetchLotteries();
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const enterLottery = async (id: bigint, price: bigint) => {
    if (!account) return;
    setLoading(true);
    setStatus(`Entering Lottery #${id}...`);
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'enterLottery',
        args: [id],
        account: account as `0x${string}`,
        value: price,
        chain: hardhat
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Success!");
      fetchLotteries();
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pickWinner = async (id: bigint) => {
    if (!account) return;
    setLoading(true);
    setStatus(`Picking winner for #${id}...`);
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'pickWinner',
        args: [id],
        account: account as `0x${string}`,
        chain: hardhat
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Winner Picked!");
      fetchLotteries();
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // -- Render Helpers --
  const renderLotteryCard = (lotto: Lottery) => {
    const isOwner = lotto.owner.toLowerCase() === account.toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    const isEnded = now > Number(lotto.endTime);
    const timeLeft = Math.max(0, Number(lotto.endTime) - now);
    
    // Formatting yield safely
    const estimatedYield = parseFloat(formatEther(lotto.currentYieldEstimate));
    const finalYield = parseFloat(formatEther(lotto.yieldGenerated));

    return (
      <div key={lotto.id.toString()} className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white">Lotto #{lotto.id.toString()}</h3>
          <span className={`px-2 py-1 rounded text-xs font-bold ${lotto.winnerPicked ? 'bg-red-900 text-red-200' : isEnded ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200'}`}>
            {lotto.winnerPicked ? "Finished" : isEnded ? "Ended (Pending)" : "Active"}
          </span>
        </div>
        
        <div className="space-y-2 text-sm text-gray-300 mb-6">
          <p>Price: <span className="font-mono text-white">{formatEther(lotto.ticketPrice)} AVAX</span></p>
          <p>Pool: <span className="font-mono text-white">{formatEther(lotto.ticketPrice * lotto.playerCount)} AVAX</span></p>
          <p>Players: {lotto.playerCount.toString()}</p>
          
          {/* Yield Display */}
          {lotto.winnerPicked ? (
             <p className="text-green-400 font-bold">Yield Generated: {finalYield} AVAX</p>
          ) : (
             <p className="text-gray-400">Est. Yield: {estimatedYield > 0 ? estimatedYield.toFixed(6) : "0.0"} AVAX</p>
          )}

          {!lotto.winnerPicked && (
             <p>Ends In: <span className="text-white font-mono">{timeLeft}s</span></p>
          )}
          {lotto.winnerPicked && (
             <div className="mt-2 p-2 bg-gray-900 rounded">
                <p className="text-yellow-500 font-bold">Winner:</p>
                <p className="font-mono text-xs break-all">{lotto.winner}</p>
             </div>
          )}
        </div>

        <div className="flex gap-2">
           {!lotto.winnerPicked && !isEnded && (
              <button 
                onClick={() => enterLottery(lotto.id, lotto.ticketPrice)}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition disabled:opacity-50"
              >
                Enter
              </button>
           )}
           {isOwner && !lotto.winnerPicked && isEnded && (
              <button 
                 onClick={() => pickWinner(lotto.id)}
                 disabled={loading || lotto.playerCount === 0n}
                 className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded transition disabled:opacity-50"
              >
                 Pick Winner
              </button>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white">
          AVAX Lotto Factory
        </h1>
        {!account ? (
          <button onClick={connectWallet} className="bg-red-600 px-4 py-2 rounded font-bold">Connect Wallet</button>
        ) : (
           <span className="font-mono text-sm bg-gray-800 px-3 py-1 rounded">{account.slice(0,6)}...</span>
        )}
      </div>

      {/* Tabs */}
      {account && (
        <div className="max-w-4xl mx-auto mb-8 flex space-x-4 border-b border-gray-700 pb-4">
           <button 
             onClick={() => setActiveTab('browse')}
             className={`px-4 py-2 rounded ${activeTab === 'browse' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
           >
             Browse Lottos
           </button>
           <button 
             onClick={() => setActiveTab('create')}
             className={`px-4 py-2 rounded ${activeTab === 'create' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
           >
             Create New
           </button>
           <button 
             onClick={() => setActiveTab('dashboard')}
             className={`px-4 py-2 rounded ${activeTab === 'dashboard' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
           >
             My Dashboard
           </button>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {status && <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800 rounded text-center">{status}</div>}

        {activeTab === 'browse' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lotteries.filter(l => !l.winnerPicked).map(renderLotteryCard)}
              {lotteries.filter(l => !l.winnerPicked).length === 0 && <p className="text-gray-500 col-span-2 text-center">No active lotteries found.</p>}
           </div>
        )}

        {activeTab === 'create' && (
           <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-6">Create a Lottery</h2>
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Ticket Price (AVAX)</label>
                    <input 
                      type="number" 
                      value={newTicketPrice} 
                      onChange={e => setNewTicketPrice(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    />
                 </div>
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Duration (Seconds)</label>
                    <input 
                      type="number" 
                      value={newDuration} 
                      onChange={e => setNewDuration(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    />
                 </div>
                 <button 
                   onClick={createLottery}
                   disabled={loading}
                   className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition"
                 >
                    {loading ? "Creating..." : "Launch Lottery"}
                 </button>
              </div>
           </div>
        )}

        {activeTab === 'dashboard' && (
           <div className="space-y-8">
              <div>
                 <h2 className="text-xl font-bold mb-4 text-gray-300">Created by Me</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lotteries.filter(l => myCreatedIds.includes(l.id)).map(renderLotteryCard)}
                    {lotteries.filter(l => myCreatedIds.includes(l.id)).length === 0 && <p className="text-gray-500">You haven't created any lotteries.</p>}
                 </div>
              </div>
              
              <div>
                 <h2 className="text-xl font-bold mb-4 text-gray-300">Joined by Me</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lotteries.filter(l => myJoinedIds.includes(l.id)).map(renderLotteryCard)}
                    {lotteries.filter(l => myJoinedIds.includes(l.id)).length === 0 && <p className="text-gray-500">You haven't joined any lotteries.</p>}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

export default App;