import { DitoElement } from "../../root.js";
import { Dito } from "../../main.js";
const URL = 'http://dito.local/';
const order = ['localstorage', 'callback', 'settings', 'input', 'output', 'bindandfor'];
const tests = {};
const success = 'SUCCESS';
const failure = 'FAILURE';
const beforeTest = e => {
  const index = getTestCounter();
  localStorage.clear();
  setTestCounter(index);
};
const componentsURL = URL + 'tests/components/';
const startOrder = e => localStorage.setItem('integration-test-current', -1);
const clearOrder = e => localStorage.removeItem('integration-test-current');
const setTestCounter = index => localStorage.setItem('integration-test-current', index);
const getTestCounter = e => localStorage.getItem('integration-test-current');
const validateTestAndMoveToNext = filename => {
    if (Object.values(tests).indexOf(failure) !== -1) {
      console.error('Errors in test');
      console.table(tests);
      return;
    }

    setTimeout(function() {
      const index = localStorage.getItem('integration-test-current');
      const newIndex = +index + 1;
      const testName = (order[newIndex] || 'end');
      localStorage.setItem('integration-test-current', newIndex);
      const location = window.location.origin + '/tests/integration/' + testName + '.html';
      if (location === window.location.href) {
        console.error('Oi we have inifnite loop here :/', order, index + ' => ' + newIndex, testName);
        return;
      }
      window.location.href = location;
    }, 200)
}
const getContainer = (set = {}) => new Dito(
  Object.assign(
    {
      url: componentsURL
    },
    set
  )
);

beforeTest();

export {
  URL,
  tests,
  success,
  failure,
  DitoElement,
  Dito,
  getContainer,
  validateTestAndMoveToNext,
  startOrder,
  clearOrder,
  getTestCounter,
  setTestCounter,
  beforeTest,
};
