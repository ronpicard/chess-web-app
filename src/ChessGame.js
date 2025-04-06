import React, { useState, useEffect } from 'react';
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
  const [aiEngine, setAIEngine] = useState('minimax');
  const [stockfish, setStockfish] = useState(null);

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
      const worker = new Worker(`${process.env.PUBLIC_URL}/stockfish/stockfish.js`);
      worker.postMessage('uci');
      setStockfish(worker);
      return () => worker.terminate();
    }
  }, [aiEngine]);

  useEffect(() => {
    if (chess.isGameOver()) {
      setGameOver(true);
      if (chess.isCheckmate()) setMessage('Checkmate!');
      else if (chess.isDraw()) setMessage('Draw!');
      else if (chess.isStalemate()) setMessage('Stalemate!');
    }
  }, [fen]);

  useEffect(() => {
    // If black is AI and it's white's turn to start
    if (playerColor === 'b' && chess.turn() === 'w' && !gameOver) {
      setAIThinking(true);
      setTimeout(() => makeAIMove(), 500);
    }
  }, [playerColor, gameOver]);

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
        setTimeout(() => makeAIMove(), 500);
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

  const makeAIMove = () => {
    if (aiEngine === 'minimax') {
      const gameCopy = new Chess(chess.fen());
      const bestMove = minimax(gameCopy, searchDepth, chess.turn() === 'w', -Infinity, Infinity);
      if (bestMove) {
        chess.move({
          from: bestMove.from,
          to: bestMove.to,
          promotion: bestMove.flags?.includes('p') ? 'q' : undefined
        });
        setFen(chess.fen());
        setAIThinking(false);
      }
      return;
    }

    if (!stockfish) return;
    const moveTime = searchDepth * 1000;

    stockfish.onmessage = (event) => {
      if (event.data === 'uciok') {
        stockfish.postMessage('isready');
      }
      if (event.data === 'readyok') {
        stockfish.postMessage(`position fen ${chess.fen()}`);
        stockfish.postMessage(`go movetime ${moveTime}`);
      }
      if (event.data.startsWith('bestmove')) {
        const [_, fromTo] = event.data.split(' ');
        const from = fromTo.slice(0, 2);
        const to = fromTo.slice(2, 4);

        chess.move({ from, to, promotion: 'q' });
        setFen(chess.fen());
        setAIThinking(false);
      }
    };

    stockfish.postMessage('uci');
  };

  const togglePlayerColor = () => {
    const newColor = playerColor === 'w' ? 'b' : 'w';
    const newGame = new Chess();
    setPlayerColor(newColor);
    setChess(newGame);
    setFen(newGame.fen());
    setGameOver(false);
    setMessage('');
    setAIThinking(false);
  };

  const handleRestart = () => {
    const newGame = new Chess();
    setChess(newGame);
    setFen(newGame.fen());
    setGameOver(false);
    setMessage('');
    setAIThinking(false);
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

  const increaseDifficulty = () => setSearchDepth(prev => Math.min(prev + 1, 3));
  const decreaseDifficulty = () => setSearchDepth(prev => Math.max(prev - 1, 1));

  const getDifficultyLabel = () => {
    return aiEngine === 'minimax'
      ? ['Easy', 'Medium', 'Hard'][searchDepth - 1]
      : ['Easy (1s)', 'Medium (2s)', 'Hard (3s)'][searchDepth - 1];
  };

  return (
    <div className="chess-game">
      <h1>AI Chess Game</h1>
      <div>
        <select onChange={e => setAIEngine(e.target.value)} value={aiEngine}>
          <option value="minimax">Minimax</option>
          <option value="stockfish">Stockfish</option>
        </select>
        <button onClick={togglePlayerColor}>
          Play as {playerColor === 'w' ? 'Black' : 'White'}
        </button>
        <button onClick={handleRestart}>Restart</button>
        <button onClick={decreaseDifficulty}>Decrease Difficulty</button>
        <button onClick={increaseDifficulty}>Increase Difficulty</button>
        <p className="player-info">AI Engine: {aiEngine}</p>
        <p className="player-info">AI Difficulty Level: {getDifficultyLabel()}</p>
        <p className="player-info">You are: {playerColor === 'w' ? 'White' : 'Black'}</p>
        <p className="player-info">The AI is: {playerColor === 'w' ? 'Black' : 'White'}</p>
        <p className={`status-message ${aiThinking ? 'ai-thinking' : 'your-move'}`}>
          {aiThinking ? 'AI is thinking...' : 'Your move!'}
        </p>
      </div>
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
