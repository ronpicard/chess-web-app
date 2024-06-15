import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import Chessboard from 'chessboardjsx';
import './ChessGame.css';

const ChessGame = () => {
  const [chess, setChess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [size, setSize] = useState(getBoardSize());
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [playerColor, setPlayerColor] = useState('w'); // 'w' for White, 'b' for Black
  const [lastMoveBy, setLastMoveBy] = useState(''); // Track the last move by 'human' or 'ai'

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
    if (!gameOver && chess.turn() !== playerColor && lastMoveBy !== 'ai') {
      makeRandomMove();
    }
  }, [fen, gameOver, playerColor, lastMoveBy]);

  const handleMove = ({ sourceSquare, targetSquare }) => {
    const possibleMoves = chess.moves({ square: sourceSquare, verbose: true });

    const isLegalMove = possibleMoves.some(
      move => move.to === targetSquare
    );

    if (isLegalMove) {
      setLastMoveBy('human'); // Set before making the move
      chess.move({
        from: sourceSquare,
        to: targetSquare,
      });
      setFen(chess.fen());

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

  const makeRandomMove = () => {
    const possibleMoves = chess.moves();
    if (possibleMoves.length === 0) return;

    setLastMoveBy('ai'); // Set before making the move
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    chess.move(possibleMoves[randomIndex]);
    setFen(chess.fen());

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

  };

  return (
    <div className="chess-game">
      <h1>Chess Game</h1>
      <div>
        <button onClick={togglePlayerColor}>
          Play as {playerColor === 'w' ? 'Black' : 'White'}
        </button>
        <p>You are playing as: {playerColor === 'w' ? 'White' : 'Black'}</p>
        <p>AI is playing as: {playerColor === 'w' ? 'Black' : 'White'}</p>
      </div>
      {gameOver && <h2>{message}</h2>}
      <div className="board-container">
        <Chessboard
          position={fen}
          onDrop={({ sourceSquare, targetSquare }) => {
            if (chess.turn() === playerColor) {
              handleMove({ sourceSquare, targetSquare });
            }
          }}
          width={size}
          draggable={!gameOver}
          orientation={playerColor === 'w' ? 'white' : 'black'}
        />
      </div>
    </div>
  );
};

export default ChessGame;
