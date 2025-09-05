import React from 'react';
import { ToastContainer } from '../toast';
import Header from './Header';

const Layout = React.memo(({ children, showHeader = true }) => {
  return (
    <div className="content-wrapper">
      {showHeader && <Header />}
      
      <main className="main-content">
        {children}
      </main>
      
      {/* Toast уведомления через ToastContainer */}
      <ToastContainer />
    </div>
  );
});

export default Layout; 
