import React, {Fragment, useEffect} from 'react';
import brace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/glsl';

// https://tmtheme-editor.herokuapp.com/#!/editor/local/Abdal%20Black%20Hackers%202
import 'brace/theme/red';
// import '../../../assets/editor-themes/red.js';

// import 'brace/theme/twilight';

import AceEditor from 'react-ace';

import {reaction} from 'mobx';
import {observer} from 'mobx-react-lite';

import classNames from 'classnames';

import './index.scss';

import getStore from '../../../store';

import {defined} from '../../../utils';

const Editor = observer((props) => {
    let store = getStore();

    const editorWrapperStyle = classNames({
        'retrace-editor__wrapper': true,
        'retrace-editor__wrapper--hidden': !store.editorVisible
    });

    const editorWindowStyle = {
        width: '100%',
        height: '100%',
        zIndex: '2'
    };

    return (
        <Fragment>
            <div className={editorWrapperStyle}>
                <AceEditor
                    name="retrace-editor"
                    editorProps={{$blockScrolling: true}}
                    style={editorWindowStyle}
                    // mode="glsl"
                    mode="glsl"
                    // theme="twilight"
                    // mode="javascript"
                    theme="red"

                    value={store.sceneSrc}

                    onChange={(contents) => store.sceneSrc = contents}
                    onFocus={() => store.editorFocused = true}
                    onBlur={() => store.editorFocused = false}

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

                    annotations={store.sceneSrcEvalError
                        ? [store.sceneSrcEvalError]
                        : null
                    }
                />
            </div>
            {store.hasSceneEvalError && store.editorVisible &&
                <div className="retrace-editor__error">
                    {store.sceneSrcEvalError.text}
                </div>
            }
        </Fragment>
    );
});

export default Editor;
