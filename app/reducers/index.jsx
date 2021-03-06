import { combineReducers } from 'redux'

const rootReducer = combineReducers({
  auth: require('./auth').default,

  plaid: require('./plaid').default,

  modal: require('./modal').default,

  budget: require('./budget').default,

  email: require('./email').default
})

export default rootReducer
