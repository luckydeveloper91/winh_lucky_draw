import React, { useState, useEffect } from 'react';
import LuckyDrawGrid from '../components/LuckyDrawGrid_Old';
import LuckyDrawSphere from '../components/LuckyDrawSphere';
import WinnerModal from '../components/WinnerModal'; // Your existing WinnerModal
import { Prize, Settings, DrawResult } from '../types';
import { useSettings, usePrizes, performLuckyDraw, verifyPrizeCode } from '../services/apiService';
import { toast } from 'react-toastify';
import { Search, Volume2, VolumeX } from 'lucide-react';

const LuckyDrawPage: React.FC = () => {
  const { settings, loading: settingsLoading } = useSettings();
  const { prizes, loading: prizesLoading, fetchPrizes } = usePrizes();
  const [showCodeVerification, setShowCodeVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<DrawResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [audio] = useState(new Audio());
  
  // Winner modal states
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  
  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  useEffect(() => {
    if (settings.backgroundMusic) {
      audio.src = settings.backgroundMusic;
      audio.loop = true;
    }
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [settings.backgroundMusic, audio]);

  const toggleMute = () => {
    if (isMuted) {
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Unable to play background music');
      });
    } else {
      audio.pause();
    }
    setIsMuted(!isMuted);
  };
  
  const handleSpin = async (code?: string): Promise<DrawResult> => {
    try {
      const result = await performLuckyDraw(code);
      
      // Set the result and show the winner modal
      setDrawResult(result);

      setTimeout(() => {
        setShowWinnerModal(true);
      }, 10000);
      
      return result;
    } catch (error) {
      console.error('Error spinning the wheel:', error);
      toast.error('Something went wrong. Please try again.');
      throw error;
    }
  };
  
  const handleCloseWinnerModal = () => {
    setShowWinnerModal(false);
    setDrawResult(null);
  };
  
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter a code');
      return;
    }
    
    setVerifying(true);
    try {
      const result = await verifyPrizeCode(verificationCode);
      setVerificationResult(result);
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Invalid or unused code');
      setVerificationResult(null);
    } finally {
      setVerifying(false);
    }
  };
  
  if (prizesLoading || settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700"></div>
        <p className="mt-4 text-amber-800">Loading lucky draw...</p>
      </div>
    );
  }
  
  if (prizes.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-amber-700">No Prizes Available</h2>
        <p className="text-gray-600 mb-6">There are no active prizes in the lucky draw system.</p>
        <p className="text-sm text-gray-500">Please check back later or contact an administrator.</p>
      </div>
    );
  }
  
  return (
    <div className="relative min-h-screen">
      {/* Background Music Control */}
      {settings.backgroundMusic && (
        <button
          onClick={toggleMute}
          className="fixed top-4 right-4 z-50 p-3 bg-white bg-opacity-90 rounded-full shadow-lg hover:bg-opacity-100 transition-all"
          title={isMuted ? "Unmute background music" : "Mute background music"}
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-amber-600" />
          ) : (
            <Volume2 className="w-6 h-6 text-amber-600" />
          )}
        </button>
      )}

      <div 
        className="py-6 px-4 rounded-xl shadow-md overflow-hidden bg-cover bg-center min-h-screen"
      >
        <LuckyDrawGrid 
          prizes={prizes} 
          onSpin={handleSpin}
          settings={settings}
          showWinnerModal={showWinnerModal}
          onCloseWinnerModal={handleCloseWinnerModal}
          drawResult={drawResult}
        />
      </div>
      
      {/* Winner Modal - Your existing component */}
      {drawResult && (
        <WinnerModal
          isOpen={showWinnerModal}
          onClose={handleCloseWinnerModal}
          result={drawResult}
        />
      )}
      
      {/* Code Verification Modal */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity ${showCodeVerification ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Verify Prize Code</h3>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter your prize code"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleVerifyCode}
                disabled={verifying}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            
            {verificationResult && (
              <div className={`p-4 rounded-lg ${verificationResult.isWinner ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h4 className={`font-bold mb-2 ${verificationResult.isWinner ? 'text-green-700' : 'text-red-700'}`}>
                  {verificationResult.isWinner ? 'Valid Prize Code!' : 'Invalid Code'}
                </h4>
                {verificationResult.isWinner && (
                  <>
                    <p className="text-gray-700 mb-2">Prize: {verificationResult.prizeName}</p>
                    {verificationResult.prizeImage && (
                      <img 
                        src={verificationResult.prizeImage} 
                        alt={verificationResult.prizeName}
                        className="w-32 h-32 object-contain mx-auto my-2"
                      />
                    )}
                  </>
                )}
                <p className="text-sm text-gray-600">{verificationResult.message}</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                setShowCodeVerification(false);
                setVerificationCode('');
                setVerificationResult(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Code Verification Button */}
      {settings.searchButton && (
        <button
          onClick={() => setShowCodeVerification(true)}
          className="fixed bottom-6 right-6"
          title="Verify Prize Code"
        >
          <img
            src={settings.searchButton}
            alt="Verify Code"
            className="w-24 h-24 hover:opacity-80 transition-opacity animate-heartbeat"
          />
        </button>
      )}
    </div>
  );
};

export default LuckyDrawPage;