import {get, set, toLower} from 'lodash';
import {getAuthFunction} from './auth-function';

const debug = require('debug')('lambda-custom-authorizer-middleware');
let localAuthorizer;

export function customLocalLambdaAuthorizer({
  identitySourceHeader = 'authorization',
  localAuthorizer: {handlerPath, handlerName} = {}
} = {}) {
  if (!handlerPath || !handlerName) {
    throw new Error('Please provide config for customLocalLambdaAuthorizer!');
  }

  return async function(req, res, next) {
    const isOffline = Boolean(process.env.IS_OFFLINE);
    debug(`[is-offline:${isOffline}]`);

    if (!isOffline) {
      debug(`[skip]`);
      return next();
    }

    localAuthorizer = getAuthFunction(handlerPath, handlerName);

    try {
      const identitySourceValue = get(req, `headers[${identitySourceHeader}]`, '');

      if (!identitySourceValue) {
        debug('[warn][empty-header-value]');
      }

      const {context} = await localAuthorizer(toLower(identitySourceValue));
      debug(`[success] %o`, context);

      set(req, 'apiGateway.event.requestContext.authorizer', context);
      debug(`[context-set:apiGateway.event.requestContext.authorizer]`);
    } catch (error) {
      debug(`[error:${error.message}] %o`, error);
      return res.status(401).json({error});
    }

    debug(`[done]`);
    return next();
  };
}