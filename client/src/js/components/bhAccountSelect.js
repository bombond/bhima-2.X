angular.module('bhima.components')
  .component('bhAccountSelect', {
    templateUrl : 'modules/templates/bhAccountSelect.tmpl.html',
    controller  : AccountSelectController,
    transclude  : true,
    bindings    : {
      accountId        : '<',
      onSelectCallback : '&',
      disable          : '<?',
      required         : '<?',
      classe           : '@?',
      accountTypeId :  '<?',
      label            : '@?',
      name             : '@?',
      excludeTitleAccounts : '@?',
      validationTrigger :  '<?',
    },
  });

AccountSelectController.$inject = [
  'AccountService', 'appcache', '$timeout', 'bhConstants', '$scope',
];

/**
 * Account selection component
 */
function AccountSelectController(Accounts, AppCache, $timeout, bhConstants, $scope) {
  var $ctrl = this;
  var hasCachedAccounts = false;
  var cache = new AppCache('bhAccountSelect');

  // fired at the beginning of the account select
  $ctrl.$onInit = function $onInit() {

    // cache the title account ID for convenience
    $ctrl.TITLE_ACCOUNT_ID = bhConstants.accounts.TITLE;

    // translated label for the form input
    $ctrl.label = $ctrl.label || 'FORM.LABELS.ACCOUNT';

    // fired when an account has been selected
    $ctrl.onSelectCallback = $ctrl.onSelectCallback || angular.noop;

    // used to disable title accounts in the select list
    $ctrl.disableTitleAccounts = $ctrl.disableTitleAccounts || true;

    // default for form name
    $ctrl.name = $ctrl.name || 'AccountForm';

    // parent form submitted
    $ctrl.validationTrigger = $ctrl.validationTrigger || false;

    if (!angular.isDefined($ctrl.required)) {
      $ctrl.required = true;
    }

    $ctrl.excludeTitleAccounts = $ctrl.excludeTitleAccounts || false;

    // load accounts
    loadAccounts();

    // alias the name as AccountForm
    $timeout(aliasComponentForm);
  };

  // this makes the HTML much more readable by reference AccountForm instead of the name
  function aliasComponentForm() {
    $scope.AccountForm = $scope[$ctrl.name];
  }

  /**
   * Checks if there the accounts have been updated recently and loads
   * the cached versions if so.  Otherwise, it fetches the accounts from
   * the server and caches them locally.
   */
  function loadAccounts() {
    if (hasCachedAccounts) {
      loadCachedAccounts();
    } else {
      loadHttpAccounts();
    }
  }

  // simply reads the accounts out of localstorage
  function loadCachedAccounts() {
    $ctrl.accounts = cache.accounts;
  }

  // loads accounts from the server
  function loadHttpAccounts() {
    const detail = $ctrl.accountTypeId || $ctrl.classe;
    const detailedRequest = detail ? 1 : 0;
    const params = { detailed : detailedRequest };

    if ($ctrl.classe) {
      params.classe = $ctrl.classe.split(',').map(num => { return parseInt(num, 10); });
    }
    if ($ctrl.accountTypeId) {
      params.type_id = $ctrl.accountTypeId.split(',').map(num => { return parseInt(num, 10); });
    }

    // load accounts
    Accounts.read(null, params)
      .then(function (elements) {
        // bind the accounts to the controller
        let accounts = Accounts.order(elements);

        if ($ctrl.excludeTitleAccounts) {
          accounts = Accounts.filterTitleAccounts(accounts);
        }

        $ctrl.accounts = accounts;

        // writes the accounts into localstorage
        // cacheAccounts($ctrl.accounts);

        // set the timeout for removing cached accounts
        // $timeout(removeCachedAccounts, CACHE_TIMEOUT);
      });
  }

  // write the accounts to localstorage
  function cacheAccounts(accounts) {
    hasCachedAccounts = true;
    cache.accounts = accounts;
  }

  // fires the onSelectCallback bound to the component boundary
  $ctrl.onSelect = function onSelect($item) {
    $ctrl.onSelectCallback({ account : $item });

    // alias the AccountForm name so that we can find it via filterFormElements
    $scope[$ctrl.name].$bhValue = $item.id;
  };

  // removes the accounts from localstorage
  function removeCachedAccounts() {
    hasCachedAccounts = false;
    delete cache.accounts;
  }
}
