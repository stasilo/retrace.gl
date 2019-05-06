import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';

const Header = ({children, ...props}) => {
    return (
        <header>
            {children}
        </header>
    );
};

export {
    Header
}
