import React, { Component } from 'react'
import { Mutation } from 'react-apollo'
import get from 'lodash/get'
import { fbt } from 'fbt-runtime'

import UpdateListingMutation from 'mutations/UpdateListing'
import AllowTokenMutation from 'mutations/AllowToken'

import TransactionError from 'components/TransactionError'
import WaitForTransaction from 'components/WaitForTransaction'
import Redirect from 'components/Redirect'
import Modal from 'components/Modal'

import AutoMutate from 'components/AutoMutate'

import withCanTransact from 'hoc/withCanTransact'
import withWallet from 'hoc/withWallet'
import withWeb3 from 'hoc/withWeb3'
import withConfig from 'hoc/withConfig'

import applyListingData from './_listingData'

class UpdateListing extends Component {
  state = {}

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.error && this.state.error && !this.state.shouldClose) {
      this.setState({
        shouldClose: true
      })
    }
  }

  render() {
    if (this.state.redirect) {
      return <Redirect to={this.state.redirect} push />
    }
    let content

    let action = (
      <button
        className={this.props.className}
        onClick={() => this.setState({ modal: true })}
        children={this.props.children}
      />
    )

    const needsAllowance = get(this.props, 'needsAllowance', false)
    const walletIsNotSeller = this.props.wallet !== this.props.listing.seller.id

    if (get(this.props, 'tokenStatus.loading')) {
      return <button className={this.props.className}>Loading...</button>
    }

    if (this.state.error) {
      content = null
    } else if (this.state.waitFor) {
      content = this.renderWaitModal()
    } else if (this.state.waitForAllow) {
      action = (
        <button
          className={this.props.className}
          onClick={() => this.setState({ modal: true })}
          children={'Wait...'}
        />
      )
      content = this.renderWaitAllowModal()
    } else if (walletIsNotSeller && needsAllowance) {
      action = this.renderAllowTokenMutation()
    } else {
      action = this.renderUpdateListingMutation()
      content = this.renderWaitModal()
    }

    return (
      <>
        {action}
        {!this.state.error ? null : (
          <TransactionError
            reason={this.state.error}
            data={this.state.errorData}
            onClose={() =>
              this.setState({ error: false, modal: false, shouldClose: false })
            }
          />
        )}
        {!this.state.modal ? null : (
          <Modal
            onClose={() => this.setState({ modal: false, shouldClose: false })}
            shouldClose={this.state.shouldClose}
            disableDismiss={true}
          >
            {content}
          </Modal>
        )}
      </>
    )
  }

  renderUpdateListingMutation() {
    return (
      <Mutation
        mutation={UpdateListingMutation}
        onCompleted={({ updateListing }) => {
          this.setState({ waitFor: updateListing.id })
        }}
        onError={errorData =>
          this.setState({ waitFor: false, error: 'mutation', errorData })
        }
      >
        {updateListing => (
          <>
            <button
              className={this.props.className}
              onClick={() => this.onClick(updateListing)}
              children={this.props.children}
            />
          </>
        )}
      </Mutation>
    )
  }

  additionalDeposit() {
    const { listing, tokenBalance, listingTokens } = this.props
    if (!tokenBalance) return '0'

    const commission = Number(listing.commission)
    const existingCommission = Number(listingTokens)
    let additionalDeposit =
      tokenBalance >= commission ? commission : tokenBalance

    if (existingCommission > 0) {
      additionalDeposit = Math.max(0, additionalDeposit - existingCommission)
    }

    return String(additionalDeposit)
  }

  onClick(updateListing) {
    if (this.props.cannotTransact) {
      this.setState({
        error: this.props.cannotTransact,
        errorData: this.props.cannotTransactData
      })
      return
    }

    this.setState({ modal: true, waitFor: 'pending' })

    const { listing } = this.props

    updateListing({
      variables: applyListingData(this.props, {
        listingID: listing.id,
        additionalDeposit: this.additionalDeposit(),
        from: listing.seller.id
      })
    })
  }

  async onTxCompleted() {
    this.setState({ loading: true })
    const { refetch, listingPromotion } = this.props

    if (refetch) {
      await refetch()
    }

    if (listingPromotion) {
      this.setState({
        redirect: `/promote/${this.props.listing.id}/success`
      })
    } else {
      this.setState({
        redirect: `/create/${this.props.listing.id}/success`
      })
    }
  }

  renderWaitModal() {
    return (
      <WaitForTransaction
        hash={this.state.waitFor}
        event="ListingUpdated"
        contentOnly={true}
        onClose={() => this.setState({ waitFor: null })}
      >
        {() => (
          <>
            <div className="spinner light" />
            <AutoMutate
              mutation={() => {
                this.onTxCompleted()
              }}
            />
          </>
        )}
      </WaitForTransaction>
    )
  }

  renderAllowTokenModal() {
    return (
      <>
        <fbt desc="updateListing.approveOGN">
          <h2>Approve OGN</h2>
          Click below to approve OGN for use on Origin
        </fbt>
        <div className="actions">
          <button
            className="btn btn-outline-light"
            onClick={() => this.setState({ shouldClose: true })}
            children={fbt('Cancel', 'Cancel')}
          />
          {this.renderAllowTokenMutation()}
        </div>
      </>
    )
  }

  renderAllowTokenMutation() {
    return (
      <Mutation
        mutation={AllowTokenMutation}
        contentOnly={true}
        onCompleted={({ updateTokenAllowance }) => {
          this.setState({ waitForAllow: updateTokenAllowance.id })
        }}
        onError={errorData =>
          this.setState({ waitForAllow: false, error: 'mutation', errorData })
        }
      >
        {allowToken => (
          <button
            className={this.props.className}
            onClick={() => this.onAllowToken(allowToken)}
            children={this.props.children}
          />
        )}
      </Mutation>
    )
  }

  onAllowToken(allowToken) {
    if (!this.canTransact()) {
      return
    }

    this.setState({ modal: true, waitForAllow: 'pending' })

    let to = this.props.listing.contractAddr
    const forceProxy = this.props.config.proxyAccountsEnabled
    const predictedProxy = this.props.walletPredictedProxy
    if (forceProxy && predictedProxy !== this.props.wallet) {
      to = predictedProxy
    }

    const variables = {
      to,
      token: 'token-OGN',
      from: this.props.walletProxy,
      value: this.additionalDeposit(),
      forceProxy: this.props.config.proxyAccountsEnabled
    }

    allowToken({ variables })
  }

  renderWaitAllowModal() {
    return (
      <WaitForTransaction hash={this.state.waitForAllow} contentOnly={true}>
        {() => (
          <div className="make-offer-modal success">
            <div className="success-icon-lg" />
            <h5>
              <fbt desc="success">Success!</fbt>
            </h5>
            <div className="help">
              <fbt desc="update.sucessMoveOgn">
                Origin may now move OGN on your behalf.
              </fbt>
            </div>
            {this.renderUpdateListingMutation()}
          </div>
        )}
      </WaitForTransaction>
    )
  }

  canTransact() {
    if (this.props.disabled) {
      return false
    }
    if (this.props.cannotTransact === 'no-wallet') {
      return false
    } else if (this.props.cannotTransact) {
      this.setState({
        modal: true,
        error: this.props.cannotTransact,
        errorData: this.props.cannotTransactData
      })
      return false
    }

    return true
  }
}

export default withConfig(withWeb3(withWallet(withCanTransact(UpdateListing))))
