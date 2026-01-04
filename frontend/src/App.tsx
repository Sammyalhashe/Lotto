import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, formatEther, parseEther } from 'viem';
import { hardhat } from 'viem/chains';
import LottoABI from './abi.json';

// NOTE: Update this address after deploying to your local node!
// Run: npx hardhat ignition deploy ignition/modules/Lotto.ts --network localhost
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 

function App() {
  const [account, setAccount] = useState<string>("");
  const [ticketPrice, setTicketPrice] = useState<string>("0");
  const [endTime, setEndTime] = useState<number>(0);
  const [owner, setOwner] = useState<string>("");
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [poolBalance, setPoolBalance] = useState<string>("0");
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

  const fetchData = async () => {
    if (!publicClient || !CONTRACT_ADDRESS) return;
    try {
      const price = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'ticketPrice',
      }) as bigint;
      setTicketPrice(formatEther(price));

      const end = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'lotteryEndTime',
      }) as bigint;
      setEndTime(Number(end));
      
      const ownerAddr = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'owner',
      }) as string;
      setOwner(ownerAddr);

      const count = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'getPlayersCount',
      }) as bigint;
      setPlayerCount(Number(count));

      const balance = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'getContractBalance',
      }) as bigint;
      setPoolBalance(formatEther(balance));

    } catch (error) {
      console.error("Error fetching contract data:", error);
      setStatus("Error connecting to contract. Is it deployed and is your wallet on Localhost 8545?");
    }
  };

  useEffect(() => {
    if (account) {
      fetchData();
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchData, 5000); 
      return () => clearInterval(interval);
    }
  }, [account]);

  const enterLottery = async () => {
    if (!account) return;
    setLoading(true);
    setStatus("Entering lottery...");
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'enter',
        account: account as `0x${string}`,
        value: parseEther(ticketPrice),
        chain: hardhat
      });
      setStatus(`Transaction sent: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Successfully entered!");
      fetchData(); // Refresh immediately after tx
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pickWinner = async () => {
    if (!account) return;
    setLoading(true);
    setStatus("Picking winner...");
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: LottoABI,
        functionName: 'pickWinner',
        account: account as `0x${string}`,
        chain: hardhat
      });
      setStatus(`Winner picked! Tx: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
      fetchData();
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const timeRemaining = Math.max(0, endTime - Math.floor(Date.now() / 1000));
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white">
        AVAX Lotto
      </h1>
      
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-gray-700">
        {!account ? (
          <button 
            onClick={connectWallet}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Connect Wallet
          </button>
        ) : (
          <>
            <div className="flex justify-between items-center bg-gray-700 p-4 rounded-lg">
              <span className="text-gray-400">Account:</span>
              <span className="font-mono text-sm">{account.slice(0,6)}...{account.slice(-4)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <p className="text-gray-400 text-sm">Ticket Price</p>
                <p className="text-2xl font-bold">{ticketPrice} AVAX</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <p className="text-gray-400 text-sm">Time Remaining</p>
                <p className="text-2xl font-bold">
                  {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <p className="text-gray-400 text-sm">Players</p>
                <p className="text-2xl font-bold">{playerCount}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <p className="text-gray-400 text-sm">Pool Size</p>
                <p className="text-2xl font-bold">{poolBalance} AVAX</p>
              </div>
            </div>

            <button 
              onClick={enterLottery}
              disabled={loading || timeRemaining === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition text-lg"
            >
              {loading ? "Processing..." : "Buy Ticket"}
            </button>

            {account.toLowerCase() === owner.toLowerCase() && (
               <div className="pt-4 border-t border-gray-600">
                  <p className="text-sm text-gray-400 mb-2 text-center">Owner Zone</p>
                  <button 
                    onClick={pickWinner}
                    disabled={loading || timeRemaining > 0 || playerCount === 0}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    Pick Winner
                  </button>
               </div>
            )}
          </>
        )}
        
        {status && (
          <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-600 text-sm text-center break-words">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;