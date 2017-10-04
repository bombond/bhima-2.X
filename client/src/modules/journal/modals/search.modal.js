angular.module('bhima.controllers')
  .controller('JournalSearchModalController', JournalSearchModalController);

JournalSearchModalController.$inject = [
  '$uibModalInstance', 'NotifyService',
  'Store', 'filters', 'options', 'PeriodService', '$translate',
  'util', 'TransactionTypeService', 'JournalService',
];

function JournalSearchModalController(Instance, Notify,
  Store, filters, options, Periods, $translate,
  util, TransactionTypes, Journal) {
  var vm = this;

  var changes = new Store({ identifier : 'key' });
  vm.filters = filters;
  vm.options = options;

  // an object to keep track of all custom filters, assigned in the view
  vm.searchQueries = {};
  vm.defaultQueries = {};

  // displayValues will be an id:displayValue pair
  var displayValues = {};

  // @TODO ideally these should be passed in when the modal is initialised
  //       these are known when the filter service is defined
  var searchQueryOptions = ['description', 'user_id', 'account_id', 'project_id', 'amount', 'trans_id', 'origin_id', 'includeNonPosted'];

  var lastViewFilters = Journal.filters.formatView().customFilters;

  // assign already defined custom filters to searchQueries object
  vm.searchQueries = util.maskObjectFromKeys(filters, searchQueryOptions);

  window.search = vm.searchQueries;

  // assign default filters
  if (filters.limit) {
    vm.defaultQueries.limit = filters.limit;
  }

  // assing default account
  if (filters.account_id) {
    vm.defaultQueries.account_id = filters.account_id;
  }

  // load all Transaction types
  TransactionTypes.read()
    .then(function (types) {
      types.forEach(function (item) {
        item.typeText = $translate.instant(item.text);
      });
      vm.transactionTypes = types;
    })
    .catch(Notify.handleError);

  // handle component selection states
  // custom filter account_id - assign the value to the searchQueries object
  vm.onSelectAccount = function onSelectAccount(account) {
    vm.searchQueries.account_id = account.id;
    displayValues.account_id = String(account.number).concat(' - ', account.label);
  };

  // Set displayLabel if the filters account is defined
  if (filters.account_id) {
    lastViewFilters.forEach(function (filter) {
      if (filter._key === 'account_id') {
        displayValues.account_id = filter._displayValue;
      }
    });
  }

  // custom filter user_id - assign the value to the searchQueries object
  vm.onSelectUser = function onSelectUser(user) {
    vm.searchQueries.user_id = user.id;
    displayValues.user_id = user.display_name;
  };

  // Set displayLabel if the filters user is defined
  if (filters.user_id) {
    lastViewFilters.forEach(function (filter) {
      if (filter._key === 'user_id') {
        displayValues.user_id = filter._displayValue;
      }
    });
  }

  // custom filter project_id - assign the value to the searchQueries object
  vm.onSelectProject = function onSelectProject(project) {
    vm.searchQueries.project_id = project.id;
    displayValues.project_id = project.name;
  };

  // Set displayLabel if the filters project is defined
  if (filters.project_id) {
    lastViewFilters.forEach(function (filter) {
      if (filter._key === 'project_id') {
        displayValues.project_id = filter._displayValue;
      }
    });
  }

  // deafult filter period - directly write to changes list
  vm.onSelectPeriod = function onSelectPeriod(period) {
    var periodFilters = Periods.processFilterChanges(period);

    periodFilters.forEach(function (filterChange) {
      changes.post(filterChange);
    });
  };

  // custom filter origin_id - assign the value to the searchQueries object
  vm.onTransactionTypesChange = function onTransactionTypesChange(transactionTypes) {
    vm.searchQueries.origin_id = transactionTypes;
    var typeText = '/';

    transactionTypes.forEach(function (typeId) {
      vm.transactionTypes.forEach(function (type) {
        if (typeId === type.id) {
          typeText += type.typeText + ' / ';
        }
      });
    });

    displayValues.origin_id = typeText;
  };

  // Set displayLabel if the filters origin_id is defined
  if (filters.origin_id) {
    lastViewFilters.forEach(function (filter) {
      if (filter._key === 'origin_id') {
        displayValues.origin_id = filter._displayValue;
      }
    });
  }

  // default filter limit - directly write to changes list
  vm.onSelectLimit = function onSelectLimit(value) {
    // input is type value, this will only be defined for a valid number
    if (angular.isDefined(value)) {
      changes.post({ key : 'limit', value : value });
    }
  };

  // deletes a filter from the custom filter object, this key will no longer be written to changes on exit
  vm.clear = function clear(key) {
    delete vm.searchQueries[key];
  };

  vm.cancel = Instance.dismiss;

  // returns the filters to the journal to be used to refresh the page
  vm.submit = function submit(form) {
    // push all searchQuery values into the changes array to be applied
    angular.forEach(vm.searchQueries, function (value, key) {
      if (angular.isDefined(value)) {
        // default to the original value if no display value is defined
        var displayValue = displayValues[key] || value;
        changes.post({ key: key, value: value, displayValue: displayValue });
       }
    });

    var loggedChanges = changes.getAll();

    // return values to the JournalController
    return Instance.close(loggedChanges);
  };
}
