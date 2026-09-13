import React, { useState } from 'react';
import GrofunderLanding from './components/GrofunderLanding';
import BlogPage from './components/BlogPage';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <>
      {currentPage === 'home' && (
        <GrofunderLanding />
      )}
      {currentPage === 'blog' && (
        <BlogPage onBack={() => setCurrentPage('home')} />
      )}
    </>
  );
};

export default App;
