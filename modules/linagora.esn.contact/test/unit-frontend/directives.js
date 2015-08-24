'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The contact Angular module directives', function() {

  beforeEach(function() {
    module('jadeTemplates');
    angular.mock.module('ngRoute');
    angular.mock.module('esn.core');
    angular.mock.module('linagora.esn.contact');
    angular.mock.module('esn.alphalist');
    module('jadeTemplates');
  });

  describe('inlineEditableInput', function() {

    beforeEach(inject(['$compile', '$rootScope', '$timeout', 'DEFAULT_AVATAR', function($c, $r, $t, DEFAULT_AVATAR) {
      this.$compile = $c;
      this.$rootScope = $r;
      this.$scope = this.$rootScope.$new();
      this.$timeout = $t;
      this.DEFAULT_AVATAR = DEFAULT_AVATAR;

      this.initDirective = function(scope) {
        var html = '<inline-editable-input input-class="aClass" type="aType" placeholder="aPlaceholder" ng-model="aModel" on-blur="aBlurFunction" on-save ="aSaveFunction"/>';
        var element = this.$compile(html)(scope);
        scope.$digest();
        return element;
      };
    }]));

    it('should bind on focus that toggle the group buttons', function() {
      var element = this.initDirective(this.$scope);
      var input = element.find('input');
      input.appendTo(document.body);
      input.focus();
      var scope = element.isolateScope();
      this.$timeout.flush();
      expect(scope.showGroupButtons).to.be.true;
    });

    it('should bind on blur and call saveInput if old value !== new value of ng-model controller', function(done) {
      this.$scope.aModel = 'value';
      this.$scope.aSaveFunction = done;
      var element = this.initDirective(this.$scope);
      var input = element.find('input');
      input.appendTo(document.body);
      input.blur();
      this.$timeout.flush();
    });

    it('should bind on blur and do not call saveInput if old value === new value', function(done) {
      this.$scope.aModel = undefined;
      this.$scope.aSaveFunction = function() {
        done(new Error('should not be called'));
      };
      this.$scope.aBlurFunction = done;
      var element = this.initDirective(this.$scope);
      var input = element.find('input');
      input.appendTo(document.body);
      input.blur();
      this.$timeout.flush();
    });

    it('should bind on blur, toggle the group buttons and call onBlur after 200 ms', function(done) {
      var scope;
      this.$scope.aModel = 'value';
      this.$scope.aSaveFunction = function() {};
      this.$scope.aBlurFunction = function() {
        expect(scope.showGroupButtons).to.be.true;
        done();
      };
      var element = this.initDirective(this.$scope);
      var input = element.find('input');
      input.appendTo(document.body);
      input.blur();
      scope = element.isolateScope();
      this.$timeout.flush();
    });

    it('should bind on keydown and call resetInput if escape is the event', function(done) {
      var element = this.initDirective(this.$scope);
      var input = element.find('input');
      input.appendTo(document.body);
      var scope = element.isolateScope();
      scope.resetInput = done;
      var escape = $.Event('keydown');
      escape.which = 27;
      input.trigger(escape);
      this.$timeout.flush();
    });

  });

  describe('The contactPhoto directive', function() {

    var element;

    beforeEach(function() {
      element = this.$compile('<contact-photo contact="contact"></contact-photo>')(this.$scope);
    });

    it('should use the default avatar if contact.photo is not defined', function() {
      this.$scope.$digest();

      expect(element.find('img').attr('src')).to.equal(this.DEFAULT_AVATAR);
    });

    it('should use the contact photo if defined', function() {
      this.$scope.contact = {
        photo: 'data:image/png,base64;abcd='
      };
      this.$scope.$digest();

      expect(element.find('img').attr('src')).to.equal('data:image/png,base64;abcd=');
    });

  });

  describe('The editable contactPhoto directive', function() {

    var element;

    beforeEach(function() {
      element = this.$compile('<contact-photo editable="true" contact="contact"></contact-photo>')(this.$scope);
    });

    it('should display the hint', function() {
      this.$scope.$digest();

      expect(element.find('i').css('display')).to.not.equal('none');
    });

  });

  describe('The contactListItem directive', function() {

    var self;

    beforeEach(function() {

      this.notificationFactory = {};
      this.contactsService = {};
      this.gracePeriodService = {
        grace: function() {
          return {
            then: function() {}
          };
        },
        cancel: function() {}
      };

      self = this;
      angular.mock.module(function($provide) {
        $provide.value('notificationFactory', self.notificationFactory);
        $provide.value('contactsService', self.contactsService);
        $provide.value('gracePeriodService', self.gracePeriodService);
      });
    });

    beforeEach(angular.mock.inject(function($rootScope, $compile) {
      this.$rootScope = $rootScope;
      this.$compile = $compile;
      this.scope = $rootScope.$new();
      this.scope.contact = {
        uid: 'myuid'
      };
      this.scope.bookId = '123';
      this.html = '<contact-list-item contact="contact" book-id="bookId"></contact-list-item>';
    }));

    describe('Setting scope values', function() {

      it('should set the first contact email and tel in scope', function(done) {
        var tel1 = '+33499998899';
        var tel2 = '+33499998800';
        var email1 = 'yo@open-paas.org';
        var email2 = 'lo@open-paas.org';

        this.scope.contact.tel = [{type: 'Home', value: tel1}, {type: 'Work', value: tel2}];
        this.scope.contact.emails = [{type: 'Home', value: email1}, {type: 'Work', value: email2}];

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();
        var iscope = element.isolateScope();
        expect(iscope.tel).to.equal(tel1);
        expect(iscope.email).to.equal(email1);
        done();
      });
    });

    describe('the deleteContact function', function() {

      it('should call contactsService.remove() with the correct bookId and contact', function(done) {

        this.contactsService.remove = function(bookId, contact) {
          expect(bookId).to.equal(self.scope.bookId);
          expect(contact).to.deep.equal(self.scope.contact);

          done();
        };

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();
        var iscope = element.isolateScope();
        iscope.deleteContact();
        done(new Error());
      });

      it('should display error when on remove failure', function(done) {
        this.notificationFactory.weakError = function() {
          done();
        };

        this.contactsService.remove = function() {
          return $q.reject();
        };

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();
        var iscope = element.isolateScope();
        iscope.deleteContact();
        this.scope.$digest();
        done(new Error());
      });

      it('should not grace the request on failure', function(done) {
        this.notificationFactory.weakError = function() {};
        this.scope.contact = {firstName: 'Foo', lastName: 'Bar'};

        this.gracePeriodService.grace = done;

        this.contactsService.remove = function() {
          return $q.reject();
        };

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();

        element.isolateScope().deleteContact();
        this.scope.$digest();

        done();
      });

      it('should grace the request using the default delay on success', function(done) {
        this.notificationFactory.weakInfo = function() {};
        this.contactsService.remove = function() {
          return $q.when('myTaskId');
        };
        this.gracePeriodService.grace = function(taskId, text, linkText, delay) {
          expect(delay).to.not.exist;

          done();
        };

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();

        element.isolateScope().deleteContact();
        this.scope.$digest();
      });

      it('should display correct title and link during the grace period', function(done) {
        this.notificationFactory.weakInfo = function() {};
        this.contactsService.remove = function() {
          return $q.when('myTaskId');
        };
        this.scope.contact.displayName = 'Foo Bar';
        this.gracePeriodService.grace = function(taskId, text, linkText, delay) {
          expect(taskId).to.equals('myTaskId');
          expect(text).to.equals('You have just deleted a contact (Foo Bar).');
          expect(linkText).to.equals('Cancel');
          expect(delay).to.not.exist;
          done();
        };

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();

        element.isolateScope().deleteContact();
        this.scope.$digest();
      });

      it('should cancel the request if the user cancels during the grace period', function(done) {
        this.notificationFactory.weakInfo = function() {};
        this.gracePeriodService.grace = function() {
          return $q.when({cancelled: true,
            success: function(textToDisplay) {
            },
            error: function(textToDisplay) {
            }});
        };
        this.contactsService.remove = function() {
          return $q.when('myTaskId');
        };
        this.gracePeriodService.cancel = function(taskId) {
          expect(taskId).to.equal('myTaskId');

          done();
        };

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();

        element.isolateScope().deleteContact();
        this.scope.$digest();
      });

      it('should notice the user that the contact deletion can\'t be cancelled', function(done) {
        this.notificationFactory.weakInfo = function() {};
        this.gracePeriodService.grace = function() {
          return $q.when({cancelled: true,
            success: function(textToDisplay) {
            },
            error: function(textToDisplay) {
              done();
            }});
        };
        this.contactsService.remove = function() {
          return $q.when('myTaskId');
        };
        this.gracePeriodService.cancel = function(taskId) {
          expect(taskId).to.equal('myTaskId');
          return $q.reject();
        };

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();

        element.isolateScope().deleteContact();
        this.scope.$digest();
      });

      it('should broadcast contact:cancel:delete on successful cancellation of a request', function(done) {
        this.notificationFactory.weakInfo = function() {};
        this.gracePeriodService.grace = function() {
          return $q.when({cancelled: true,
            success: function(textToDisplay) {
            },
            error: function(textToDisplay) {
            }});
        };
        this.gracePeriodService.cancel = function() {
          return $q.when();
        };
        this.contactsService.remove = function() {
          return $q.when('myTaskId');
        };

        self.$rootScope.$on('contact:cancel:delete', function() {
          done();
        });

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();

        element.isolateScope().deleteContact();
        this.scope.$digest();
      });
    });
  });

  describe('The relaxedDate directive', function() {

    var $compile, $rootScope, element, $scope, DATE_FORMAT;

    beforeEach(inject(function(_$compile_, _$rootScope_, _DATE_FORMAT_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      DATE_FORMAT = _DATE_FORMAT_;

      $scope = $rootScope.$new();
    }));

    beforeEach(function() {
      element = $compile('<form name="form"><input type="text" name="date" relaxed-date ng-model="date" /></form>')($scope);
    });

    it('should define the placeholder on the element', function() {
      expect(element.find('input').attr('placeholder')).to.equal(DATE_FORMAT);
    });

    it('should parse the value as a Date object', function() {
      $scope.form.date.$setViewValue('01/31/1970');
      $scope.$digest();

      expect($scope.date).to.equalDate(new Date(1970, 0, 31));
    });

    it('should allow any string value', function() {
      $scope.form.date.$setViewValue('I am not a date');
      $scope.$digest();

      expect($scope.date).to.equal('I am not a date');
    });

    it('should display a formatted date if the model contains a valid Date', function() {
      $scope.date = new Date(2015, 0, 15);
      $scope.$digest();

      expect($scope.form.date.$viewValue).to.equal('01/15/2015');
    });

    it('should display any string value if model is not a Date', function() {
      $scope.date = 'I am still not a date';
      $scope.$digest();

      expect($scope.form.date.$viewValue).to.equal('I am still not a date');
    });
  });


  describe('The keepScrollPosition directive', function() {
    var $location;
    var $timeout;
    var $scope;

    function doInject() {
      inject(function(_$location_, _$timeout_, $compile, $rootScope) {
        $location = _$location_;
        $timeout = _$timeout_;
        $scope = $rootScope.$new();
        $compile('<div keep-scroll-position></div>')($scope);
      });
    }

    it('should use $cacheFactory to store scroll position', function(done) {
      var CACHE_KEY = 'scrollPosition';

      module('linagora.esn.contact', function($provide) {
        $provide.decorator('$cacheFactory', function($delegate) {
          $delegate.get = function(key) {
            expect(key).to.equal(CACHE_KEY);
            done();
          };
          return $delegate;
        });
      });

      doInject();
      $scope.$digest();
    });

    it('should save scroll position on $locationChangeStart event', function(done) {
      var path = '/a/path/here';
      var position = 100;

      module('linagora.esn.contact', function($provide) {
        $provide.decorator('$location', function($delegate) {
          $delegate.path = function() {
            return path;
          };
          return $delegate;
        });

        $provide.decorator('$document', function($delegate) {
          $delegate.scrollTop = function() {
            return position;
          };
          return $delegate;
        });

        $provide.decorator('$cacheFactory', function($delegate) {
          $delegate.get = function() {
            return {
              put: function(key, value) {
                expect(key).to.equal(path, position);
                done();
              }
            };
          };
          return $delegate;
        });
      });

      doInject();
      $scope.$digest();
      $scope.$emit('$locationChangeStart');
    });

    it('should scroll to saved position on viewRenderFinished event', function(done) {
      var path = '/a/path/here';
      var position = 100;

      module('linagora.esn.contact', function($provide) {
        $provide.decorator('$location', function($delegate) {
          $delegate.path = function() {
            return path;
          };
          return $delegate;
        });

        $provide.decorator('$document', function($delegate) {
          $delegate.scrollTop = function(top) {
            expect(top).to.equal(position);
            done();
          };
          return $delegate;
        });

        $provide.decorator('$cacheFactory', function($delegate) {
          $delegate.get = function() {
            return {
              get: function(key) {
                expect(key).to.equal(path);
                return position;
              }
            };
          };
          return $delegate;
        });
      });

      doInject();
      $scope.$digest();
      $scope.$emit('viewRenderFinished');
      $timeout.flush();
    });

  });

});
