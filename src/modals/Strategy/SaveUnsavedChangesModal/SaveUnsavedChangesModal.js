import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Intent } from '@ufx-ui/core'
import Modal from '../../../ui/Modal'

const SaveUnsavedChangesModal = ({
  onClose,
  isOpen,
  strategy,
  nextStrategy,
  onLoadStrategy,
  saveStrategy,
}) => {
  const { label } = strategy || {}
  const { t } = useTranslation()

  const changeStrategyAndClose = () => {
    onLoadStrategy(nextStrategy, true)
    onClose()
  }

  const saveAndClose = () => {
    saveStrategy(strategy)
    changeStrategyAndClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      label={t('strategyEditor.unsavedChangesModalTitle')}
    >
      <p>
        {t('strategyEditor.unsavedChangesModalText', { strategyName: label })}
      </p>
      <Modal.Footer>
        <Modal.Button primary onClick={saveAndClose}>
          {t('ui.save')}
        </Modal.Button>
        <Modal.Button secondary onClick={onClose}>
          {t('ui.cancel')}
        </Modal.Button>
        <Modal.Button intent={Intent.ERROR} onClick={changeStrategyAndClose}>
          {t('ui.closeWithoutSaving')}
        </Modal.Button>
      </Modal.Footer>
    </Modal>
  )
}

SaveUnsavedChangesModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  strategy: PropTypes.shape({
    label: PropTypes.string,
  }),
  nextStrategy: PropTypes.shape({
    label: PropTypes.string,
  }),
  onLoadStrategy: PropTypes.func.isRequired,
  saveStrategy: PropTypes.func.isRequired,
}

SaveUnsavedChangesModal.defaultProps = {
  strategy: {
    label: '',
  },
  nextStrategy: {},
}

export default SaveUnsavedChangesModal
