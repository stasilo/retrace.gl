import React, {Fragment} from 'react';
import Hotkeys from 'react-hot-keys';

import {observer} from 'mobx-react-lite';

import {Header} from './layout';

import RenderStatus from './components/controls/render-status';
import RenderControls from './components/controls/render-controls';
import SeedControls from './components/controls/seed-controls';
import RealtimeControls from './components/controls/realtime-controls';

import SceneControls from './components/controls/scene-controls';
import SaveControls from './components/controls/save-controls';
import EditorControls from './components/controls/editor-controls';
import ExportSdfControls from './components/controls/export-sdf-controls';
import RenderModeControls from './components/controls/render-mode-controls';
import FileControls from './components/controls/file-controls';

import Editor from './components/editor';
import Error from './components/error';
import ProgressBar from './components/progress-bar';
import CenteredNotice from './components/centered-notice';

import getStore from '../store';

const UI = observer(() => {
    let store = getStore();

    return (
        <Hotkeys
            keyName="alt+r,alt+e,alt+g,alt+h"
            // ace renders its input as an offscreen textarea, and react-hot-keys'
            // default filter drops every key event coming from one - which killed
            // these shortcuts whenever the editor had focus. Let ace's input
            // through, keep ignoring ordinary form fields.
            filter={(event) => {
                const target = event.target || event.srcElement;

                if(target.classList
                    && target.classList.contains('ace_text-input'))
                {
                    return true;
                }

                return !(target.isContentEditable
                    || target.tagName == 'INPUT'
                    || target.tagName == 'SELECT'
                    || target.tagName == 'TEXTAREA');
            }}
            onKeyUp={store.handleUiKeyShortcut}
        >
            <Header>
                <FileControls/>
                <RenderStatus/>
                <RenderModeControls/>
                <SeedControls/>
                <RenderControls/>
                <RealtimeControls/>
                <SceneControls/>
                <SaveControls/>
                <ExportSdfControls/>
                <EditorControls/>
            </Header>
            {store.hasLoadingError &&
                <Error message={store.loadingError} />
            }
            <Editor/>
            <ProgressBar
                progress={store.renderProgress}
            />
            {store.sceneCompilationInProgress &&
                <CenteredNotice message="compiling scene shader - this may take a while..."/>
            }
        </Hotkeys>
    );
});

export default UI;
