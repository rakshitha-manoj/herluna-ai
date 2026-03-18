import React, { useState } from 'react';

const Simulator = () => {
    const [sleep, setSleep] = useState(7);
    const [stress, setStress] = useState(50);
    const [prediction, setPrediction] = useState({ cramps: 20, mood: 80 });

    const handleSimulate = () => {
        // Mock simulation logic (ideally calls backend)
        const crampsProb = Math.max(0, 40 - (sleep * 2) + (stress / 10));
        const moodScore = Math.min(100, 50 + (sleep * 5) - (stress / 5));
        setPrediction({ cramps: Math.round(crampsProb), mood: Math.round(moodScore) });
    };

    return (
        <div className="w-full max-w-md mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5">
                <h3 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    What-if Simulator
                </h3>
            </div>
            <div className="p-6 space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest opacity-60">
                        <span>Sleep Hours</span>
                        <span>{sleep}h</span>
                    </div>
                    <input 
                        type="range" min="4" max="10" step="0.5" value={sleep} 
                        onChange={(e) => {setSleep(parseFloat(e.target.value)); handleSimulate();}}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest opacity-60">
                        <span>Stress Level</span>
                        <span>{stress}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="100" value={stress} 
                        onChange={(e) => {setStress(parseInt(e.target.value)); handleSimulate();}}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
                
                <div className="pt-6 border-t border-white/10">
                    <h4 className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-4 text-center">Predicted Impact</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-center">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mb-1">Cramps Prob</div>
                            <div className="text-3xl font-bold text-white">{prediction.cramps}%</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-1">Mood Score</div>
                            <div className="text-3xl font-bold text-white">{prediction.mood}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Simulator;
