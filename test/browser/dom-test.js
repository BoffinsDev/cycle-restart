/* globals describe, it */
import assert from 'assert';
import {run} from '@cycle/core';
import {makeDOMDriver, div, button} from '@cycle/dom';

import {restart, restartable} from '../../src/restart';

import {Observable} from 'rx';

import $ from 'jquery';

let testContainerCount = 0;

function makeTestContainer () {
  const selector = 'test-' + testContainerCount;
  const container = $(`<div class="${selector}">`);

  $(document.body).append(container);

  testContainerCount++;

  return {container, selector: '.' + selector};
}

describe('restarting a cycle app', () => {
  function main ({DOM}) {
    const count$ = DOM
      .select('.add')
      .events('click')
      .map(_ => 1)
      .scan((total, change) => total + change)
      .startWith(0);

    return {
      DOM: count$.map(count =>
        div('.app', [
          div('.count', count.toString()),
          button('.add', '+')
        ])
      )
    };
  }

  function newMain ({DOM}) {
    const count$ = DOM
      .select('.add')
      .events('click')
      .map(_ => 2)
      .scan((total, change) => total + change)
      .startWith(0);

    return {
      DOM: count$.map(count =>
        div('.app', [
          div('.count', count.toString()),
          button('.add', '+')
        ])
      )
    };
  }

  it('is possible', (done) => {
    const {container, selector} = makeTestContainer();

    const drivers = {
      DOM: restartable(makeDOMDriver(selector), {pauseSinksWhileReplaying: false})
    };

    const {sources, sinks} = run(main, drivers);

    setTimeout(() => {
      container.find('.add').click();
      container.find('.add').click();
      container.find('.add').click();

      assert.equal(container.find('.count').text(), 3);

      restart(newMain, drivers, {sources, sinks});

      setTimeout(() => {
        assert.equal(container.find('.count').text(), 6);

        container.remove();
        done();
      });
    });
  });

  it('handles multiple restarts', (done) => {
    const {container, selector} = makeTestContainer();

    const drivers = {
      DOM: restartable(makeDOMDriver(selector), {pauseSinksWhileReplaying: false})
    };

    let sourcesAndSinks = run(main, drivers);

    assert.equal(container.find('.count').text(), 0);

    setTimeout(() => {
      container.find('.add').click();
      container.find('.add').click();
      container.find('.add').click();

      assert.equal(container.find('.count').text(), 3);

      sourcesAndSinks = restart(main, drivers, sourcesAndSinks);

      setTimeout(() => {
        assert.equal(container.find('.count').text(), 3);

        container.find('.add').click();
        container.find('.add').click();
        container.find('.add').click();

        assert.equal(container.find('.count').text(), 6);

        sourcesAndSinks = restart(main, drivers, sourcesAndSinks);

        setTimeout(() => {
          assert.equal(container.find('.count').text(), 6);

          container.remove();
          done();
        });
      });
    });
  });
});

describe('restarting a cycle app with multiple streams', () => {
  it('works', (done) => {
    const {container, selector} = makeTestContainer();

    function main ({DOM}) {
      const add$ = DOM
        .select('.add')
        .events('click')
        .map(_ => 1);

      const subtract$ = DOM
        .select('.subtract')
        .events('click')
        .map(_ => -1);

      const count$ = add$.merge(subtract$)
        .scan((total, change) => total + change)
        .startWith(0);

      return {
        DOM: count$.map(count =>
          div('.app', [
            div('.count', count.toString()),
            button('.add', '+'),
            button('.subtract', '+')
          ])
        )
      };
    }

    const drivers = {
      DOM: restartable(makeDOMDriver(selector), {pauseSinksWhileReplaying: false})
    };

    const {sources} = run(main, drivers);

    setTimeout(() => {
      container.find('.add').click();
      container.find('.add').click();
      container.find('.add').click();

      assert.equal(container.find('.count').text(), 3);

      container.find('.subtract').click();
      container.find('.subtract').click();
      container.find('.subtract').click();

      assert.equal(container.find('.count').text(), 0);

      restart(main, drivers, {sources});

      setTimeout(() => {
        assert.equal(container.find('.count').text(), 0);

        container.remove();
        done();
      });
    });
  });
});
