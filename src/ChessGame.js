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
  const [playerColor, setPlayerColor] = useState('w'); // 'w' for White, 'b' for Black
  const [lastMoveBy, setLastMoveBy] = useState(''); // Track the last move by 'human' or 'ai'
  const [searchDepth, setSearchDepth] = useState(3); // Customizable search depth
  const [aiThinking, setAIThinking] = useState(false); // Track AI thinking status
  const [clickedSquare, setClickedSquare] = useState(null); // Track clicked square

  function getBoardSize() {
    const minWidthHeight = Math.min(window.innerWidth, window.innerHeight);
    return minWidthHeight * 0.8; // 80% of the smaller dimension
  }

  useEffect(() => {
    const handleResize = () => {
      setSize(getBoardSize());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (chess.isCheckmate()) {
      setGameOver(true);
      setMessage('Checkmate!');
    } else if (chess.isDraw()) {
      setGameOver(true);
      setMessage('Draw!');
    } else if (chess.isStalemate()) {
      setGameOver(true);
      setMessage('Stalemate!');
    }
    if (!gameOver && chess.turn() !== playerColor && lastMoveBy === 'human') {
      setAIThinking(true);
      setTimeout(() => {
        makeAIMove();
      }, 500); // Pause for 0.5 seconds before making the AI move
    }
  }, [fen, gameOver, playerColor, lastMoveBy]);

  useEffect(() => {
    if (playerColor === 'b' && chess.turn() === 'w' && !gameOver && lastMoveBy === '') {
      // If the player is black and it's white's turn, AI should make the first move
      setAIThinking(true);
      setTimeout(() => {
        makeAIMove();
      }, 500);
    }
  }, [playerColor, gameOver, lastMoveBy]);

  const handleMove = ({ sourceSquare, targetSquare }) => {
    const possibleMoves = chess.moves({ square: sourceSquare, verbose: true });

    const isLegalMove = possibleMoves.some(
      move => move.to === targetSquare
    );

    if (isLegalMove) {
      const moveDetails = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: possibleMoves.some(move => move.flags.includes('p')) ? 'q' : undefined
      });
      setFen(chess.fen());
      setLastMoveBy('human'); // Set after making the move
      setClickedSquare(null); // Clear clicked square

      if (chess.isCheckmate()) {
        setGameOver(true);
        setMessage('Checkmate!');
      } else if (chess.isDraw()) {
        setGameOver(true);
        setMessage('Draw!');
      } else if (chess.isStalemate()) {
        setGameOver(true);
        setMessage('Stalemate!');
      }
    } else {
      console.log("Invalid move", sourceSquare, targetSquare);
    }
  };

  const evaluateBoard = (board) => {
    const pieceValue = {
      'p': 1,
      'r': 5,
      'n': 3,
      'b': 3,
      'q': 9,
      'k': 1000
    };

    return _.sumBy(board.flat(), piece => {
      if (piece) {
        const value = pieceValue[piece.type];
        return piece.color === 'w' ? value : -value;
      }
      return 0;
    });
  };

  const minimax = (game, depth, isMaximizingPlayer) => {
    if (depth === 0 || game.isGameOver()) {
      return evaluateBoard(game.board());
    }

    const moves = game.moves({ verbose: true });
    let bestMove;
    if (isMaximizingPlayer) {
      let bestValue = -Infinity;
      for (let move of moves) {
        game.move(move);
        const value = minimax(game, depth - 1, false);
        game.undo();
        if (value > bestValue) {
          bestValue = value;
          bestMove = move;
        }
      }
      return depth === searchDepth ? bestMove : bestValue;
    } else {
      let bestValue = Infinity;
      for (let move of moves) {
        game.move(move);
        const value = minimax(game, depth - 1, true);
        game.undo();
        if (value < bestValue) {
          bestValue = value;
          bestMove = move;
        }
      }
      return depth === searchDepth ? bestMove : bestValue;
    }
  };

  const makeAIMove = () => {
    const gameCopy = new Chess(chess.fen());
    const bestMove = minimax(gameCopy, searchDepth, chess.turn() === 'w');

    if (bestMove) {
      setLastMoveBy('ai'); // Set before making the AI move
      const moveDetails = chess.move({
        from: bestMove.from,
        to: bestMove.to,
        promotion: bestMove.flags && bestMove.flags.includes('p') ? 'q' : undefined
      });
      setFen(chess.fen());
      setAIThinking(false); // AI has finished thinking
      if (chess.isCheckmate()) {
        setGameOver(true);
        setMessage('Checkmate!');
      } else if (chess.isDraw()) {
        setGameOver(true);
        setMessage('Draw!');
      } else if (chess.isStalemate()) {
        setGameOver(true);
        setMessage('Stalemate!');
      } else {
        // Switch back to human move
        setLastMoveBy('ai-done');
      }
    } else {
      setAIThinking(false);
    }
  };

  const togglePlayerColor = () => {
    const newPlayerColor = playerColor === 'w' ? 'b' : 'w';
    setPlayerColor(newPlayerColor);
    setGameOver(false);
    setMessage('');
    const newChess = new Chess();
    setChess(newChess);
    setFen(newChess.fen());
    setLastMoveBy('');
    setAIThinking(false); // Reset AI thinking status
  };

  const handleRestart = () => {
    const newChess = new Chess();
    setChess(newChess);
    setFen(newChess.fen());
    setGameOver(false);
    setMessage('');
    setLastMoveBy('');
    setAIThinking(false); // Reset AI thinking status
  };

  const handleSquareClick = (square) => {
    if (clickedSquare) {
      handleMove({ sourceSquare: clickedSquare, targetSquare: square });
    }
    setClickedSquare(square);
  };

  const customSquareStyles = () => {
    const highlightStyles = {};

    if (clickedSquare) {
      highlightStyles[clickedSquare] = {
        backgroundColor: 'rgba(255, 255, 0, 0.4)', // Highlight clicked square
      };

      const possibleMoves = chess.moves({ square: clickedSquare, verbose: true });
      possibleMoves.forEach(move => {
        highlightStyles[move.to] = {
          backgroundColor: 'rgba(255, 0, 0, 0.4)', // Highlight possible moves
        };
      });
    }

    return highlightStyles;
  };

  return (
    <div className="chess-game">
      <h1>AI Chess Game</h1>
      <div>
        <button onClick={togglePlayerColor}>
          Play as {playerColor === 'w' ? 'Black' : 'White'}
        </button>
        <button onClick={handleRestart}>
          Restart
        </button>
        <label>
          AI Difficulty Level:
          <input
            type="number"
            value={searchDepth}
            onChange={(e) => setSearchDepth(Number(e.target.value))}
            min="1"
            max="4"
          />
        </label>
        <p className="player-info">You are: {playerColor === 'w' ? 'White' : 'Black'}</p>
        <p className="player-info">The AI is: {playerColor === 'w' ? 'Black' : 'White'}</p>
        <p className={`status-message ${aiThinking ? 'ai-thinking' : 'your-move'}`}>
          {aiThinking ? 'AI is thinking...' : "Your move!"}
        </p>
      </div>
      {gameOver && <h2>{message}</h2>}
      <div className="board-container">
        <Chessboard
          position={fen}
          onDrop={({ sourceSquare, targetSquare }) => {
            if (chess.turn() === playerColor && lastMoveBy !== 'ai') {
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