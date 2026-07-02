import { useEffect, useRef, useState } from 'react'
import _debounce from 'lodash/debounce'

import { PAPER_MODE } from '../../../redux/reducers/ui'

const ipcHelpers = window.electronService

// Lightweight, serialisable context handed to the workspace so the generated
// CLAUDE.md can describe the strategy to the `claude` CLI.
const buildMeta = (strategy = {}) => {
  const { label, strategyOptions = {} } = strategy
  return {
    label,
    symbol: strategyOptions?.symbol?.wsID || null,
    timeframe: strategyOptions?.timeframe || null,
    strategyOptions: {
      timeframe: strategyOptions?.timeframe || null,
      margin: strategyOptions?.margin || false,
      candleSeed: strategyOptions?.candleSeed || null,
    },
  }
}

// Keeps a strategy's on-disk workspace in sync with the editor in both
// directions: editor edits are mirrored to files (so CLI tools see them), and
// external file edits (e.g. from the `claude` CLI) are pushed back into Redux.
//
// The returned `externalSync` bumps `rev` and carries the new `content` only on
// genuine external file edits; IDEPanel watches it to re-hydrate the editor
// without clobbering the user's in-flight typing. The content rides along with
// the rev so re-hydration never races the Redux -> props round trip.
const useStrategyWorkspaceSync = ({ strategy, setStrategy, setStrategyDirty }) => {
  const strategyRef = useRef(strategy)
  strategyRef.current = strategy

  const [externalSync, setExternalSync] = useState({ rev: 0, content: null })

  const strategyId = strategy?.id
  const strategyContent = strategy?.strategyContent

  const syncToFiles = useRef(
    _debounce((payload) => {
      if (ipcHelpers) {
        ipcHelpers.syncStrategyWorkspace(payload)
      }
    }, 400),
  ).current

  // editor -> files
  useEffect(() => {
    if (!ipcHelpers || !strategyId) {
      return
    }
    syncToFiles({
      strategyId,
      strategyContent: strategyContent || {},
      meta: buildMeta(strategyRef.current),
    })
  }, [strategyId, strategyContent, syncToFiles])

  // files -> editor
  useEffect(() => {
    if (!ipcHelpers || !strategyId) {
      return undefined
    }

    const onFilesChanged = (_event, payload) => {
      const { current } = strategyRef
      if (!payload || payload.strategyId !== current?.id) {
        return
      }
      setStrategy({ ...current, strategyContent: payload.strategyContent }, PAPER_MODE)
      setStrategyDirty(true)
      setExternalSync(({ rev }) => ({ rev: rev + 1, content: payload.strategyContent }))
    }

    ipcHelpers.addStrategyFilesChangedListener(onFilesChanged)

    return () => {
      ipcHelpers.stopStrategyWorkspace(strategyId)
      ipcHelpers.removeStrategyFilesChangedListener()
    }
  }, [strategyId, setStrategy, setStrategyDirty])

  return externalSync
}

export default useStrategyWorkspaceSync
