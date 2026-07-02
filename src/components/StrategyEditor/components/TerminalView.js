import React, { useEffect, useRef } from 'react'
import PropTypes from 'prop-types' // eslint-disable-line no-unused-vars
import { useSelector } from 'react-redux'
import { v4 as uuidv4 } from 'uuid'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

import { getCurrentStrategy } from '../../../redux/selectors/ui'

const ipcHelpers = window.electronService

const TERMINAL_THEME = {
  background: '#172d3e',
  foreground: '#d6deeb',
  cursor: '#d6deeb',
  selectionBackground: '#1d3b52',
}

const buildMeta = (strategy = {}) => {
  const { label, strategyOptions = {} } = strategy
  return {
    label,
    symbol: strategyOptions?.symbol?.wsID || null,
    timeframe: strategyOptions?.timeframe || null,
    strategyOptions: {
      timeframe: strategyOptions?.timeframe || null,
      margin: strategyOptions?.margin || false,
    },
  }
}

// Bare interactive shell (backed by node-pty in the Electron main process),
// rendered as a tab in the strategies dock. It opens inside the current
// strategy's on-disk workspace, so CLI tools such as the `claude` CLI can
// read/write the strategy's code sections. Meant to be used as a Panel tab
// (pass `tabtitle`), so it renders no Panel of its own.
const TerminalView = () => {
  const containerRef = useRef(null)
  const idRef = useRef(uuidv4())
  const strategy = useSelector(getCurrentStrategy)
  const strategyId = strategy?.id || null

  // Keep the active strategy's workspace materialised and the `current` symlink
  // pointed at it. Runs on strategy change WITHOUT recreating the shell, so the
  // terminal stays in the stable workspaces root (Claude --resume keeps working).
  useEffect(() => {
    if (!ipcHelpers || !strategyId) {
      return
    }
    ipcHelpers.syncStrategyWorkspace({
      strategyId,
      strategyContent: strategy?.strategyContent || {},
      meta: buildMeta(strategy),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId])

  useEffect(() => {
    if (!ipcHelpers || !containerRef.current) {
      return undefined
    }

    const id = idRef.current
    const term = new Terminal({
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      theme: TERMINAL_THEME,
      scrollback: 5000,
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    ipcHelpers.terminalCreate({ id, cols: term.cols, rows: term.rows })

    const inputDisposable = term.onData((data) => ipcHelpers.terminalInput(id, data))

    const onData = (_event, payload) => {
      if (payload && payload.id === id) {
        term.write(payload.data)
      }
    }
    const onExit = (_event, payload) => {
      if (payload && payload.id === id) {
        term.write('\r\n\x1b[33m[shell exited — reopen the tab to restart]\x1b[0m\r\n')
      }
    }
    ipcHelpers.addTerminalDataListener(onData)
    ipcHelpers.addTerminalExitListener(onExit)

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit()
        ipcHelpers.terminalResize(id, term.cols, term.rows)
      } catch (e) {
        // ignore transient resize errors during teardown
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      inputDisposable.dispose()
      ipcHelpers.terminalKill(id)
      ipcHelpers.removeTerminalListeners()
      term.dispose()
    }
  }, [])

  if (!ipcHelpers) {
    return (
      <div className='hfui-strategyeditor__terminal-unavailable'>
        <p>The terminal is only available in the desktop app.</p>
      </div>
    )
  }

  return <div ref={containerRef} className='hfui-strategyeditor__terminal' />
}

export default TerminalView
