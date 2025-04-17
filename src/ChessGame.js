import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import Chessboard from 'chessboardjsx';
import './ChessGame.css';
import _ from 'lodash';

const ChessGame = () => {
  const [chess, setChess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [size, setSize] = useState(getBoardSize);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [playerColor, setPlayerColor] = useState('w');
  const [searchDepth, setSearchDepth] = useState(3);
  const [aiThinking, setAIThinking] = useState(false);
  const [clickedSquare, setClickedSquare] = useState(null);
  const [aiEngine, setAIEngine] = useState('stockfish');
  const [stockfish, setStockfish] = useState(null);
  const aiGameRef = useRef(new Chess());

  function getBoardSize() {
    const minWidthHeight = Math.min(window.innerWidth, window.innerHeight);
    return minWidthHeight * 0.8;
  }

  useEffect(() => {
    const handleResize = () => setSize(getBoardSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (aiEngine === 'stockfish') {
      const stockfishWorker = new Worker(`${process.env.PUBLIC_URL}/stockfish/stockfish-17-single.js`);
      setStockfish(stockfishWorker);
      stockfishWorker.postMessage('uci');

      stockfishWorker.onmessage = (event) => {
        const msg = event.data;

        if (msg === 'uciok') {
          stockfishWorker.postMessage('isready');
        }

        if (msg === 'readyok') {
          if (aiThinking) {
            stockfishWorker.postMessage(`position fen ${aiGameRef.current.fen()}`);
            stockfishWorker.postMessage(`go movetime ${searchDepth * 1000}`);
          }
        }

        if (msg.startsWith('bestmove')) {
          const [_, fromTo] = msg.split(' ');
          const from = fromTo.slice(0, 2);
          const to = fromTo.slice(2, 4);

          const move = aiGameRef.current.move({ from, to, promotion: 'q' });

          if (move) {
            setFen(aiGameRef.current.fen());
            setChess(new Chess(aiGameRef.current.fen()));
          } else {
            console.error('Invalid move from Stockfish:', {
              from,
              to,
              fen: aiGameRef.current.fen(),
            });
          }

          setAIThinking(false);
        }
      };

      return () => stockfishWorker.terminate();
    }
  }, [aiEngine, searchDepth, aiThinking]);

  useEffect(() => {
    if (chess.isGameOver()) {
      setGameOver(true);
      if (chess.isCheckmate()) setMessage('Checkmate!');
      else if (chess.isDraw()) setMessage('Draw!');
      else if (chess.isStalemate()) setMessage('Stalemate!');
    }
  }, [fen]);

  const handleMove = ({ sourceSquare, targetSquare }) => {
    const possibleMoves = chess.moves({ square: sourceSquare, verbose: true });
    const isLegalMove = possibleMoves.some(move => move.to === targetSquare);

    if (isLegalMove) {
      chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: possibleMoves.some(move => move.flags.includes('p')) ? 'q' : undefined
      });
      setFen(chess.fen());
      setClickedSquare(null);

      if (!chess.isGameOver()) {
        setAIThinking(true);
        setTimeout(() => makeAIMoveFromGame(chess), 500);
      }
    }
  };

  const evaluateBoard = (board) => {
    const pieceValue = { 'p': 1, 'r': 5, 'n': 3, 'b': 3, 'q': 9, 'k': 1000 };
    return _.sumBy(board.flat(), piece => {
      if (piece) {
        const value = pieceValue[piece.type];
        return piece.color === 'w' ? value : -value;
      }
      return 0;
    });
  };

  const minimax = (game, depth, isMaximizingPlayer, alpha, beta) => {
    if (depth === 0 || game.isGameOver()) {
      if (game.isCheckmate()) return isMaximizingPlayer ? -Infinity : Infinity;
      if (game.isStalemate() || game.isDraw()) return 0;
      return evaluateBoard(game.board());
    }

    const moves = game.moves({ verbose: true });
    let bestEval = isMaximizingPlayer ? -Infinity : Infinity;
    let bestMove = null;

    for (let move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, !isMaximizingPlayer, alpha, beta);
      game.undo();

      if (isMaximizingPlayer) {
        if (evaluation > bestEval) {
          bestEval = evaluation;
          bestMove = move;
        }
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      } else {
        if (evaluation < bestEval) {
          bestEval = evaluation;
          bestMove = move;
        }
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
    }

    return depth === searchDepth ? bestMove : bestEval;
  };

  const makeAIMoveFromGame = (gameInstance) => {
    if (aiEngine === 'minimax') {
      const bestMove = minimax(new Chess(gameInstance.fen()), searchDepth, gameInstance.turn() === 'w', -Infinity, Infinity);
      if (bestMove) {
        gameInstance.move({
          from: bestMove.from,
          to: bestMove.to,
          promotion: bestMove.flags?.includes('p') ? 'q' : undefined
        });
        setFen(gameInstance.fen());
        setChess(new Chess(gameInstance.fen()));
        setAIThinking(false);
      }
      return;
    }

    if (!stockfish) return;

    const clone = new Chess(gameInstance.fen());
    aiGameRef.current = clone;

    setAIThinking(true);
    stockfish.postMessage(`position fen ${clone.fen()}`);
    stockfish.postMessage(`go movetime ${searchDepth * 1000}`);
  };

  const resetGame = (newColor) => {
    if (stockfish) {
      stockfish.terminate();
      setStockfish(null);
    }

    const newGame = new Chess();
    aiGameRef.current = newGame;
    setPlayerColor(newColor);
    setChess(newGame);
    setFen(newGame.fen());
    setGameOver(false);
    setMessage('');
    setAIThinking(false);
    setClickedSquare(null);

    if (aiEngine === 'minimax') {
      if (newGame.turn() !== newColor) {
        setAIThinking(true);
        setTimeout(() => makeAIMoveFromGame(newGame), 500);
      }
    }
  };

  const handleRestart = () => resetGame(playerColor);

  const togglePlayerColor = () => {
    const newColor = playerColor === 'w' ? 'b' : 'w';
    resetGame(newColor);
  };

  const handleSquareClick = (square) => {
    if (clickedSquare) {
      handleMove({ sourceSquare: clickedSquare, targetSquare: square });
    }
    setClickedSquare(square);
  };

  const customSquareStyles = () => {
    const styles = {};
    if (clickedSquare) {
      styles[clickedSquare] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
      const moves = chess.moves({ square: clickedSquare, verbose: true });
      moves.forEach(move => {
        styles[move.to] = { backgroundColor: 'rgba(255, 0, 0, 0.4)' };
      });
    }
    return styles;
  };

  const increaseDifficulty = () => setSearchDepth(prev => Math.min(prev + 1, 4));
  const decreaseDifficulty = () => setSearchDepth(prev => Math.max(prev - 1, 1));

  const getDifficultyLabel = () => {
    const suffix =
      searchDepth === 1 ? ' (easiest)' :
      searchDepth === 4 ? ' (hardest)' : '';
    return aiEngine === 'minimax'
      ? `Search Depth ${searchDepth}${suffix}`
      : `Thinking ${searchDepth}s${suffix}`;
  };

  return (
    <div className="chess-game">
      <h1>AI Chess Game V2</h1>
      <div className="button-group">
        <select className="engine-select" onChange={e => setAIEngine(e.target.value)} value={aiEngine}>
          <option value="minimax">Minimax</option>
          <option value="stockfish">Stockfish</option>
        </select>
        <button className="color-toggle-button" onClick={togglePlayerColor}>
          Play as {playerColor === 'w' ? 'Black' : 'White'}
        </button>
        <button className="reset-button" onClick={handleRestart}>Restart</button>
        <button onClick={decreaseDifficulty}>Decrease Difficulty</button>
        <button onClick={increaseDifficulty}>Increase Difficulty</button>
      </div>
      <p className="player-info">AI Engine: {aiEngine.charAt(0).toUpperCase() + aiEngine.slice(1)}</p>
      <p className="player-info">AI Difficulty Level: {getDifficultyLabel()}</p>
      <p className="player-info">You are: {playerColor === 'w' ? 'White' : 'Black'}</p>
      <p className="player-info">The AI is: {playerColor === 'w' ? 'Black' : 'White'}</p>
      <p className={`status-message ${aiThinking ? 'ai-thinking' : 'your-move'}`}>
        {aiThinking ? 'AI is thinking...' : 'Your move!'}
      </p>
      {gameOver && <h2>{message}</h2>}
      <div className="board-container">
        <Chessboard
          position={fen}
          onDrop={({ sourceSquare, targetSquare }) => {
            if (!aiThinking && chess.turn() === playerColor && !gameOver) {
              handleMove({ sourceSquare, targetSquare });
            }
          }}
          onSquareClick={handleSquareClick}
          width={size}
          draggable={!gameOver}
          orientation={playerColor === 'w' ? 'white' : 'black'}
          squareStyles={customSquareStyles()}
        />
      </div>
    </div>
  );
};

export default ChessGame;
