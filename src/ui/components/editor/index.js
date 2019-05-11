import React from 'react';
import AceEditor from 'react-ace';

import {observer} from 'mobx-react-lite';

import brace from 'brace';
import 'brace/mode/javascript';
import 'brace/theme/twilight';

import classNames from 'classnames';

import './index.scss';

import getStore from '../../../store';

const onChange = (contents) => {
    let store = getStore();
    store.sceneSrc = contents;
}

const Editor = observer((props) => {
    let store = getStore();

    const editorWrapperStyle = classNames({
        'retrace-editor__wrapper': true,
        'retrace-editor__wrapper--hidden': !store.editorVisible
    });

    const editorWindowStyle = {
        width: '100%',
        height: '100%'
    };

    return (
        <div className={editorWrapperStyle}>
            <AceEditor
                style={editorWindowStyle}
                mode="glsl"
                theme="twilight"
                onChange={onChange}
                name="retrace-editor"
                value={store.sceneSrc}
                editorProps={{$blockScrolling: true}}
                commands={[{
                    name: 'hideEditor',
                    bindKey: {win: 'Alt-h', mac: 'Option-h'},
                    exec: () => store.handleUiKeyShortcut('alt+h')
                }, {
                    name: 'renderScene',
                    bindKey: {win: 'Alt-r', mac: 'Option-r'},
                    exec: () => store.handleUiKeyShortcut('alt+r')
                }, {
                    name: 'regenerateScene',
                    bindKey: {win: 'Alt-g', mac: 'Option-g'},
                    exec: () => store.handleUiKeyShortcut('alt+g')
                }, {
                    name: 'toggleComment',
                    bindKey: {win: 'Alt-Shift-7', mac: 'Option-Shift-7'},
                    exec: 'togglecomment'
                }]}
            />
        </div>
    );
});
// togglecomment : Cmd-/
// toggleBlockComment : Cmd-Shift-/

export default Editor;
