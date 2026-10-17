import React, {Fragment, useEffect} from 'react';
// react-ace >= 7 renders with ace-builds, which keeps its own module registry -
// anything registered via brace is invisible to it, so load everything from here.
import 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-glsl';

// https://tmtheme-editor.herokuapp.com/#!/editor/local/Abdal%20Black%20Hackers%202
import '../../../assets/editor-themes/red.js';

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

                    // alt+r/e/g/h are handled globally in ui/index.js so they
                    // fire whether or not the editor has focus - binding them
                    // here too would run each one twice.
                    commands={[{
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
