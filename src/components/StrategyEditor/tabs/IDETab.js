import React, { memo, useCallback } from 'react'
import PropTypes from 'prop-types'
import IDEPanel from '../../IDEPanel'
import StrategiesGridLayout from '../components/StrategiesGridLayout'
import { COMPONENTS_KEYS, IDE_LAYOUT_CONFIG } from '../components/StrategiesGridLayout.constants'
import IDENoticePanel from '../../IDENoticePanel'
import IDEHelpPanel from '../../IDEHelpPanel'
import useStrategyWorkspaceSync from '../hooks/useStrategyWorkspaceSync'

const IDETab = (props) => {
  const { strategy, setStrategy, setStrategyDirty } = props
  const { id } = strategy

  const externalRev = useStrategyWorkspaceSync({ strategy, setStrategy, setStrategyDirty })

  const renderGridComponents = useCallback((i) => {
    switch (i) {
      case COMPONENTS_KEYS.OPTIONS:
        return <IDENoticePanel />
      case COMPONENTS_KEYS.IDE:
        return <IDEPanel {...props} externalRev={externalRev} key={id} />
      case COMPONENTS_KEYS.HELP_DOCS:
        return <IDEHelpPanel />

      default:
        return null
    }
  }, [props, id, externalRev])
  return (
    <div className='hfui-strategyeditor__wrapper'>
      <StrategiesGridLayout
        layoutConfig={IDE_LAYOUT_CONFIG}
        renderGridComponents={renderGridComponents}
      />
    </div>
  )
}

IDETab.propTypes = {
  strategy: PropTypes.shape({
    id: PropTypes.string,
  }).isRequired,
  setStrategy: PropTypes.func.isRequired,
  setStrategyDirty: PropTypes.func.isRequired,
}

export default memo(IDETab)
