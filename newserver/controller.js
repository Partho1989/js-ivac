app.controller('payment_application', ['$scope', '$timeout', '$http', '$filter', 'vcRecaptchaService', 'LanguageService', 'ValidationService', '$sce', function($scope, $timeout, $http, $filter, recaptcha, LanguageService,ValidationService,$sce){
    $scope.$validationOptions = { debounce: 1500, preValidateFormElements: false };

    $scope.amountChangeData = [];

    $scope.oneAtATime = true;

    $scope.groups = [
        {
            title: 'Dynamic Group Header - 1',
            content: 'Dynamic Group Body - 1'
        },
        {
            title: 'Dynamic Group Header - 2',
            content: 'Dynamic Group Body - 2'
        }
    ];

    $scope.items = ['Item 1', 'Item 2', 'Item 3'];

    $scope.addItem = function() {
        var newItemNo = $scope.items.length + 1;
        $scope.items.push('Item ' + newItemNo);
    };

    $scope.status = {
        isCustomHeaderOpen: false,
        isFirstOpen: true,
        isFirstDisabled: false
    };



    $scope.open_modal = 0;
    $scope.alert_modal_class = '';
    $scope.alert_icon_class = '';
    $scope.alert_modal_title = '';
    $scope.alert_modal_content = '';

    $scope.transaction = {};
    $scope.query = {
        web_id : "",
        passport : ""
    };
    $scope.query_page = false;
    $scope.openQuery = function(){
      if($scope.query_page){
          $scope.query_page = false;
          $scope.transaction = {};
          $scope.refresh_captcha();
      }
      else{
          $scope.query_page = true;
          $scope.refresh_captcha();
      }
    };

    /* LOAD LANGUAGE */
    $scope.language = [];
    LanguageService.get().then(function(resp){
       $scope.language = resp.data;
    });

    /* LOADER */
    $scope.loading = false;
    $scope.loading_text = "Please wait we are connecting";



    $scope.payment = [];
    $scope.maxindex = 5;
    $scope.cindex = 0; //current_application_index
    $scope.aindex = 0;
    $scope.payment[0] = {
        web_id : '',
        web_id_repeat : '',
        passport : '',
        name : '',
        phone : '',
        email: '',
        amount : '0.00',
        captcha : '',
        center : {},
        is_open : true
    };



    $scope.pay = {
        web_id : '',
        web_id_repeat : '',
        passport : '',
        name : '',
        phone : '',
        email : '',
        amount : '0.00',
        captcha : "",
        center : {}
    };
    $scope.selected_center = "";
    $scope.active_form = 1;
    $scope.payment_options = [];
    $scope.selected_payment = {};
    $scope.payment_grand_total = 0;
    $scope.payment_grand_charge = 0;
    $scope.payment_grand_with_charge = 0;

    $scope.verifyOtp = false;
    $scope.showAppointData = false;
    $scope.slotDates = [];
    $scope.slotTimes = [];
    $scope.selected_slot = {};
    $scope.appointment_date = null;
    $scope.appointment_time = null;
    $scope.phoneEditable = true;
    $scope.emailEditable = true;
    $scope.disableVerifyBtn = true;
    $scope.sendOtpDisabled = false;
    // $scope.captchaVerified = false;
    $scope.captchaVerifiedPay = false;

    /* ANALYZE WEB FILE NUMBER TO FILTER IVAC CENTERS DEPENDING ON CENTERS */
    $scope.analyzeCenter = function(center){
        if(!angular.isUndefined($scope.ivacs)){
            if($scope.ivacs.length > 0){
                angular.forEach($scope.ivacs, function(v,k){
                    if(v.center_info_id === center.id){
                        $scope.selected_center = v.center_info_id;
                        $scope.payment[$scope.cindex].center = center;
                    }
                });
            }
        }
    };
    $scope.analyzeWebfile = function(webfileno){
        if(!angular.isUndefined(webfileno) && webfileno !== "") {
            if (webfileno.length === 12) {
                var country_code = webfileno.substr(0, 3);

                var commission_center = webfileno.substr(3, 1);

                var found = false;
                if ($scope.payment[$scope.cindex].center !== null) {

                    // CHECK DUPLICATE IN CART
                    if($scope.cindex > 0) { // IF CART HAS MORE THAN ONE FILE THEN CHECK

                        var objIndex = $scope.payment.findIndex(function(itm) {
                            return itm.web_id == webfileno;
                        });
                        if(objIndex != $scope.cindex){
                           found = true;
                        }


                        /*found = $scope.payment.some(function (el) {
                            console.log(el);
                             el.web_id === webfileno;
                        });*/
                        if (found) {
                            $scope.showAlert('danger', 'Error!', 'This webfile is already added to your application list');
                        }
                    }

                    // CHECK IF WRONG HIGH COMMISSION SELECTED
                    if ($scope.payment[$scope.cindex].center.prefix !== commission_center) {
                        $scope.showAlert('danger', 'Error!', 'You are selecting wrong High Commission center for your web file Application');
                    }

                    // CHECK IF WEB FILE HAS PAYMENT ALREADY
                    var paid = $.ajax({
                        type: "GET",
                        url: basepath+'/payment/check/'+$scope.payment[$scope.cindex].web_id,
                        async: false
                    }).responseText;
                    if(paid === 'true'){
                        $scope.showAlert('danger', 'Error!', 'This webfile has a payment already, try another web file.');
                        // $scope.showAlert('danger', 'Error!', 'All IVACs will be remain closed till further notice, due to unstable situation. Next application date will be informed through SMS & It is requested to pick up the passport on the next working day.');
                    }
                }
                else {
                    $scope.showAlert('danger', 'Error!', 'Please choose your center first');
                }

            }
            else {
                $scope.showAlert('danger', 'Error!', 'Please correct your web file number');
            }
        }
        else{
            $scope.showAlert('danger', 'Error!', 'Please input your web file number');
        }
    };
    /* ANALYZE IVAC CENTER TO GENERATE PRICING */
    $scope.analyzeIvac = function(ivac){

        if(!angular.isUndefined(ivac)){
            if(!angular.isUndefined(ivac.visa_fee)){
                if(ivac.visa_fee !== '')
                    $scope.payment[$scope.cindex].amount = ivac.visa_fee;
                    var old_fees = !angular.isUndefined(ivac.old_visa_fee) ? ivac.old_visa_fee : "";
                    var applied_from = !angular.isUndefined(ivac.new_fees_applied_from) ? ivac.new_fees_applied_from : "";
                    var notify_from = !angular.isUndefined(ivac.notify_fees_from) ? ivac.notify_fees_from : "";
                    var max_count = !angular.isUndefined(ivac.max_notification_count) ? ivac.max_notification_count : "";
                    var allow_until_new_date = !angular.isUndefined(ivac.alow_old_amount_until_new_date) ? ivac.alow_old_amount_until_new_date : "";
                    $scope.notifyAmountChange(ivac.app_key, old_fees, applied_from, notify_from, max_count, allow_until_new_date);

            }
            else{

            }
        }
        else{

        }
    };

    // Notify any amount change for IVAC
    $scope.notifyAmountChange = function(apikey, old_fees, applied_from, notify_from, max_count,allow_until_new_date){
        /* CHECK CAPTCHA */
        var data = $.param({
            'api_key': apikey,
            '_token' : $('#applicationForm input[name="_token"]').val(),
        });
        var config = {
            headers : {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };
        $scope.loading = true;
        $http.post(basepath+'/notify_amount_change', data, config).then(function(resp){
            $scope.loading = false;
            if(!angular.isUndefined(resp.data)){
                if(!angular.isUndefined(resp.data.status)){
                    if(resp.data.status === "success"){
                        $scope.amountChangeData = resp.data.data;
                        $scope.payment[$scope.cindex].amountChangeData = resp.data.data;


                        if(!angular.isUndefined($scope.amountChangeData.notice)){
                            if($scope.amountChangeData.notice){
                                $scope.payment[$scope.cindex].notice_short = $scope.amountChangeData.notice_short;
                            }
                        }

                        if(!angular.isUndefined($scope.amountChangeData.allow_old_amount_until_new_date)){
                            if($scope.amountChangeData.allow_old_amount_until_new_date == 1){
                                $scope.payment[$scope.cindex].amount = $scope.amountChangeData.old_visa_fees;
                            }
                            if($scope.amountChangeData.allow_old_amount_until_new_date == 2){
                                $scope.payment[$scope.cindex].amount = $scope.amountChangeData.old_visa_fees;
                            }
                        }
                    }
                    else{
                        $scope.showAlert('danger', 'Error!', resp.data.message);
                    }
                }
                else{
                    $scope.showAlert('danger', 'Error!', 'A1');
                }
            }
            else{
                $scope.showAlert('danger', 'Error!', 'Unable to talk with google services');
            }
        }, function(error){
            console.log("Your session timeout or can not be served now, Try again later");
            // $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
        });
    };

    /* CHECK ALL INFORMATION AND PROCEED TO PAY */
    $scope.CheckInfo = function(pay){
        /* CHECK CAPTCHA */
        var data = $.param({
            'response': pay.captcha,
            '_token' : $scope.apiKey
        });
        var config = {
            headers : {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };
        $scope.loading = true;
        $http.post(basepath+'/verify_captcha', data, config).then(function(resp){
            $scope.loading = false;
            if(!angular.isUndefined(resp.data)){
                if(!angular.isUndefined(resp.data.success)){
                    if(resp.data.success){
                        $scope.CheckAndPay(pay);
                    }
                    else{
                        $scope.showAlert('danger', 'Error!', 'Captcha Error, Do it properly');
                    }
                }
                else{
                    $scope.showAlert('danger', 'Error!', 'Please click captch again or Unable to get proper response with google services');
                }
            }
            else{
                $scope.showAlert('danger', 'Error!', 'Unable to talk with google services');
            }
        }, function(error){
            $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
        });
    };
    $scope.CheckAndPay = function(pay){
        //$scope.loader();
        var validation = $scope.paymentValidation(pay);

        if(validation){
            var data = $.param({
                'apiKey': $scope.apiKey,
                'action': 'generateInvoice',
                'amount' : '10.00'
            });

            var config = {
                headers : {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
                }
            };

            $scope.loading = true;
            $http.post(basepath+'/api/get_payment_options', data, config).then(function(resp){
                $scope.loading = false;
                if(!angular.isUndefined(resp.data)){
                    if(!angular.isUndefined(resp.data.status)){
                        if(resp.data.status === 'OK'){
                            if(!angular.isUndefined(resp.data.data)) {
                                var json = '';
                                try {
                                    json = JSON.parse(resp.data.data);
                                }
                                catch (e) {
                                    json = resp.data.data;
                                }


                                $scope.refresh_captcha();
                                $scope.payment_options = json;
                                $timeout(function(){
                                    angular.element('.nav-tabs a[href="#payment"]').trigger('click');
                                    $('[href="#payment"]').tab('show');
                                });
                                $('.nav-tabs a[href="#payment"]').tab('show');
                                $scope.active_form = 4;

                                $scope.editable1 = false;
                                $scope.editable2 = false;
                                $scope.editable3 = true;

                                $scope.calculateTotal();

                            }
                            else{
                                $scope.showAlert('danger', 'Error!', 'Issue with data, try again');
                            }
                        }
                        else{
                            $scope.showAlert('danger', 'Error!', 'Fail to get status');
                        }
                    }
                    else{
                        $scope.showAlert('danger', 'Error!', 'invalid format of response');
                    }
                }
                else{
                    $scope.showAlert('danger', 'Error!', 'Unable to talk with process services');
                }


            }, function(error){
                $scope.loading = false;
                $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
            });
        }
        else{
            $scope.loading = false;
            /* INVALID PAYMENT INFO */
        }
    };

    /*new appointment */
    $scope.CheckAndPayV2 = function(pay){
      //  console.log(pay[0]);
        //$scope.loader();
        $scope.loading = true;

        var validation = $scope.paymentValidation(pay);

        if(validation){
            var data = $.param({
                '_token' : window.csrf_token,
                'apiKey': $scope.apiKey,
                'action': 'generateInvoice',
                'amount' : '10.00',
                'ivac_id': pay[0].ivac.id,
                'visa_type': pay[0].visa_type.id,
                'payChannel': $scope.channel_name,
                'info' : $scope.payment,
            });

            var config = {
                headers : {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
                }
            };

            $http.post(basepath+'/get_payment_options_v2', data, config).then(function(resp){
                $scope.loading = false;
                if(!angular.isUndefined(resp.data)){
                    if(!angular.isUndefined(resp.data.status)){
                        if(resp.data.status === 'OK'){
                            if(!angular.isUndefined(resp.data.data)) {
                                var json = '';
                                var slotDates;
                                var slotTimes;
                                try {
                                    json = JSON.parse(resp.data.data);
                                    slotDates = resp.data.slot_dates;
                                }
                                catch (e) {
                                    json = resp.data.data;
                                    slotDates = resp.data.slot_dates;
                                }

                                $scope.payment_options = json;
                                //$scope.slotDates = slotDates;
                                $timeout(function(){
                                    angular.element('.nav-tabs a[href="#payment"]').trigger('click');
                                    $('[href="#payment"]').tab('show');
                                });
                                $('.nav-tabs a[href="#payment"]').tab('show');
                                $scope.active_form = 4;

                                $scope.editable1 = false;
                                $scope.editable2 = false;
                                $scope.editable3 = true;

                                $scope.calculateTotal();

                            }
                            else{
                                $scope.showAlert('danger', 'Error!', 'Issue with data, try again');
                            }
                        }
                        else{
                            $scope.showAlert('danger', 'Error!', 'Fail to get status');
                        }
                    }
                    else{
                        $scope.showAlert('danger', 'Error!', 'invalid format of response');
                    }
                }
                else{
                    $scope.showAlert('danger', 'Error!', 'Unable to talk with process services');
                }


            }, function(error){
                $scope.loading = false;
                $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
            });
        }
        else{
            $scope.loading = false;
            /* INVALID PAYMENT INFO */
        }
    };

    $scope.selectAppointmentDate = function (slot_date, webFileInfo, e){
        /*console.log(slot_date);
        console.log(webFileInfo);*/


        var data = $.param({
            '_token' : window.csrf_token,
            'apiKey': $scope.apiKey,
            'action': 'generateSlotTime',
            'amount' : '10.00',
            'ivac_id': webFileInfo.ivac.id,
            'visa_type': webFileInfo.visa_type.id,
            'specific_date' : slot_date,
            'info' : $scope.payment,
        });

        var config = {
            headers : {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };

        $scope.loading = true;
        $http.post(basepath+'/get_payment_options_v2', data, config).then(function(resp){
            $scope.loading = false;
            if(!angular.isUndefined(resp.data)){
                if(!angular.isUndefined(resp.data.status)){
                    if(resp.data.status === 'OK'){
                        if(!angular.isUndefined(resp.data.data)) {
                            var slotTimes;
                            try {
                                slotTimes = resp.data.slot_times;
                            }
                            catch (e) {
                                slotDates = resp.data.slot_dates;
                            }
                            $scope.slotTimes = slotTimes;


                        }
                        else{
                            $scope.showAlert('danger', 'Error!', 'Issue with data, try again');
                        }
                    }
                    else{
                        $scope.showAlert('danger', 'Error!', 'Fail to get status');
                    }
                }
                else{
                    $scope.showAlert('danger', 'Error!', 'invalid format of response');
                }
            }
            else{
                $scope.showAlert('danger', 'Error!', 'Unable to talk with process services');
            }


        }, function(error){
            $scope.loading = false;
            $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
        });

    }

    $scope.selectAppointmentTime = function (slot, webFileInfo, e){
        $scope.selected_slot = slot;
    }

    $scope.recaptchaTokenPay = null;
    window.setRecaptchaTokenPay = function(token) {
        $scope.$apply(function() {
            $scope.recaptchaTokenPay = token;
            $scope.captchaVerifiedPay = !!token; // Set captchaVerified to true if token exists
        });
    };

    $scope.payNowV2 = function(){

        // if (!$scope.isCaptchaCorrect) {
        //     $scope.showAlert('danger', 'Error!', 'Captcha does not match.');
        //     $scope.loading = false;
        //     return;
        // }

        /* VALIDATION NEEDED*/
        $scope.loading = true;

        if (!$scope.recaptchaTokenPay) {
            $scope.loading = false;
            $scope.showAlert('danger', 'Error!', 'Validation failed. Please try again later.');
            return;
        }

        var data = $.param({
            '_token' : window.csrf_token,
            'apiKey': $scope.apiKey,
            'action': 'payInvoice',
            'info' : $scope.payment,
            'selected_payment' : $scope.selected_payment,
            'selected_slot' : $scope.selected_slot,
            'hash_params': $scope.recaptchaTokenPay,
        });

        var config = {
            headers : {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };
        $http.post(basepath+'/slot_pay_now', data, config).then(function(resp){
            if(!angular.isUndefined(resp.data)){
                if(!angular.isUndefined(resp.data.status)){
                    if(resp.data.status === 'OK'){
                        if(!angular.isUndefined(resp.data.url)) {

                            if(!angular.isUndefined(resp.data.order_id)){
                                localStorage.setItem('last_order_id', resp.data.order_id);
                            }
                            window.location.href = resp.data.url+$scope.selected_payment.slug;
                            //$scope.loading = false;
                        }
                        else{
                            $scope.loading = false;
                            $scope.recaptchaTokenPay = null;
                            $scope.showAlert('danger', 'Error!', 'Payment gateway not running right now');
                        }
                    }
                    else if(resp.data.status === 'FAIL'){
                        $scope.loading = false;
                        $scope.recaptchaTokenPay = null;
                        if(!angular.isUndefined(resp.data.errors)) {
                            $scope.errors = '';
                            try {
                                $scope.errors = JSON.parse(resp.data.errors);
                            }
                            catch (e) {
                                $scope.errors = resp.data.errors;
                            }

                            var string = "";
                            if(!angular.isUndefined($scope.errors.selected_payment)){
                                string += "<h5> Payment Selection Error:</h5><ul class='list-unstyled'>";
                                angular.forEach($scope.errors.selected_payment, function(v, k){
                                    string += "<li>"+v+"</li>";
                                });
                                string += "</ul>";
                            }
                            else if(!angular.isUndefined($scope.errors.info)){
                                string += "<h5> Payment Information Error:</h5><ul class='list-unstyled'>";
                                angular.forEach($scope.errors.info, function(v, k){
                                    string += "<li>"+v+"</li>";
                                });
                                string += "</ul>";
                            }
                            else if(!angular.isUndefined($scope.errors)){
                                string += "<h5>Error:</h5><ul class='list-unstyled'>";
                                if(angular.isString($scope.errors)){
                                    string += $scope.errors;
                                }
                                else{
                                    angular.forEach($scope.errors, function(v, k){
                                        if(angular.isString(v)) {
                                            string += "<li>" + v + "</li>";
                                        }
                                    });
                                }
                                string += "</ul>";
                            }

                            $scope.showAlert('danger', 'Error!', string);
                        }
                        else{
                            $scope.showAlert('danger', 'Error!', 'Failed to connect. Try again');
                        }
                    }
                    else{
                        $scope.showAlert('danger', 'Error!', 'Unable to connect to server. Try again');
                    }
                }
                else{
                    $scope.showAlert('danger', 'Error!', 'invalid format of response');
                }
            }
            else{
                $scope.showAlert('danger', 'Error!', 'Unable to talk with process services');
            }


        }, function(error){
            $scope.loading = false;
            $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
        });

    };


    $scope.addMoreFamilyApplication = function(payment,e){
        /*console.log($scope.payment);
        console.log(payment[0]);
        console.log($scope.cindex);*/
       // let cindex = $scope.cindex;
        $scope.payment[$scope.cindex] = {
            phone : payment[0].phone,
            email : payment[0].email,
            center : payment[0].center,
            ivac : payment[0].ivac,
            visa_type : payment[0].visa_type,
            amount : payment[0].amount,
        };
        $scope.phoneEditable = false;
        $scope.emailEditable = false;
        $scope.ivacs = [];
        $scope.visa_types = [];
        $scope.centers = [];
        $scope.centers = [payment[0].center];
        $scope.ivacs = [payment[0].ivac];
        $scope.visa_types = [payment[0].visa_type];
        $scope.active_form = 1;
        $scope.verifyOtp = false;
        $scope.showAppointData = false;
        $scope.payment[0].otp = '';
    };

    $scope.switchAppointmentDate = function (webFileInfo,e){
        $scope.payment[0].appointment_time = $scope.appointment_date;
        var slot_date = $scope.appointment_date;
        $scope.selectAppointmentDate(slot_date,webFileInfo,e);
    }

    $scope.switchAppointmentTime = function (webFileInfo,e){
        $scope.selected_slot = JSON.parse($scope.appointment_time);
        $scope.payment[0].appointment_time = $scope.appointment_time.hour;
        //console.log($scope.appointment_time);

    }

    /*end appointment*/
    
    /*send otp */
    $scope.sendOtp = function() {
        $scope.loading = true;

        var resend = $scope.verifyOtp ? 1 : 0;
        // var recaptchaSiteKey = document.getElementById('hashed-param').getAttribute('data-hashed-param');

        /* VALIDATION NEEDED*/
        var data = $.param({
            '_token': window.csrf_token,
            'apiKey': $scope.apiKey,
            'action': 'sendOtp',
            'info': $scope.payment,
            'resend' : resend,
        });
        var config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            },
        };
        $http.post(basepath + '/queue-manage', data, config).then(function (resp) {
            if(!angular.isUndefined(resp.data)){
                $scope.loading = false;
                var error_reason = resp.data.data.error_reason;
                if(resp.data.code == 200){
                    $scope.payment[0].otp = null;
                    $scope.verifyOtp = true;
                    $scope.sendOtpDisabled = true;
                    $timeout(function() {
                        $scope.sendOtpDisabled = false;
                    }, 32000);
                } else {
                    $scope.loading = false;
                    $scope.recaptchaToken = null;
                    $scope.showAlert('danger', 'Error!', error_reason);
                    return;
                }
            } else{
                $scope.loading = false;
                $scope.showAlert('danger', 'Error!', 'Failed to connect. Try again');
            }


        }, function(error){
            $scope.loading = false;
            $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
        });
    };



    $scope.verifyOtpClick = function (){
        $scope.loading = true;
        var data = $.param({
            '_token': window.csrf_token,
            'apiKey': $scope.apiKey,
            'action': 'verifyOtp',
            'info': $scope.payment,
            'otp':$scope.payment[0].otp,
        });
        var config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };
        $http.post(basepath + '/queue-manage', data, config).then(function (resp) {
            if(!angular.isUndefined(resp.data)){
                $scope.loading = false;
                var error_reason = resp.data.data.error_reason;
                if(resp.data.code == 200){
                    $scope.showAppointData = true;
                    $scope.slotDates = resp.data.data.slot_dates;
                } else {
                    $scope.showAppointData = false;
                    $scope.showAlert('danger', 'Error!', error_reason);
                }
            } else{
                $scope.loading = false;
                $scope.showAlert('danger', 'Error!', 'Failed to connect. Try again');
            }


        }, function(error){
            $scope.loading = false;
            $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
        });
    }
    /*end otp*/

    $scope.calculateTotal = function(){
        var total = 0;
        angular.forEach($scope.payment, function(val, key){
            total = parseInt(total) + parseInt(val.amount);
        });
        if(total > 0){
            $scope.payment_grand_total = total;
            $scope.payment_grand_charge = (total * 0.03).round(3);
            $scope.payment_grand_with_charge = (total + $scope.payment_grand_charge).round(3);
        }
        else{
            $scope.showAlert('danger', 'Amount mismatch', 'Avoid doing wrong amount of transaction, start over the payment');
        }
    };
    $scope.selectPayment = function(p, e){
        //console.log(e);
        $scope.selected_payment = p;
        $scope.calculateTotal();
        $scope.selected_payment.grand_total = $scope.payment_grand_with_charge;
    };
    $scope.selectPaymentType = function(p, e){
        $scope.selected_payment = p;
        $scope.selected_payment.grand_total = $scope.payment_grand_with_charge;
    };
    $scope.Paynow = function(){

        /* VALIDATION NEEDED*/

        var data = $.param({
            '_token' : window.csrf_token,
            'apiKey': $scope.apiKey,
            'action': 'payInvoice',
            'info' : $scope.payment,
            'selected_payment' : $scope.selected_payment
        });

        var config = {
            headers : {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };
        $scope.loading = true;
        $http.post(basepath+'/pay_now', data, config).then(function(resp){
            if(!angular.isUndefined(resp.data)){
                if(!angular.isUndefined(resp.data.status)){
                    if(resp.data.status === 'OK'){
                        // console.log(resp.data);
                        if(!angular.isUndefined(resp.data.url)) {

							if(!angular.isUndefined(resp.data.order_id)){
								localStorage.setItem('last_order_id', resp.data.order_id);
							}
                            window.location.href = resp.data.url+$scope.selected_payment.slug;
                            //$scope.loading = false;
                        }
                        else{
                            $scope.loading = false;
                            $scope.showAlert('danger', 'Error!', 'Payment gateway not running right now');
                        }
                    }
                    else if(resp.data.status === 'FAIL'){
                        $scope.loading = false;
                        if(!angular.isUndefined(resp.data.errors)) {
                            $scope.errors = '';
                            try {
                                $scope.errors = JSON.parse(resp.data.errors);
                            }
                            catch (e) {
                                $scope.errors = resp.data.errors;
                            }
                            // console.log($scope.errors);

                            var string = "";
                            if(!angular.isUndefined($scope.errors.selected_payment)){
                                string += "<h5> Payment Selection Error:</h5><ul class='list-unstyled'>";
                                angular.forEach($scope.errors.selected_payment, function(v, k){
                                    string += "<li>"+v+"</li>";
                                });
                                string += "</ul>";
                            }
                            else if(!angular.isUndefined($scope.errors.info)){
                                string += "<h5> Payment Information Error:</h5><ul class='list-unstyled'>";
                                angular.forEach($scope.errors.info, function(v, k){
                                    string += "<li>"+v+"</li>";
                                });
                                string += "</ul>";
                            }
                            else if(!angular.isUndefined($scope.errors)){
                                string += "<h5>Error:</h5><ul class='list-unstyled'>";
                                if(angular.isString($scope.errors)){
                                    string += $scope.errors;
                                }
                                else{
                                    angular.forEach($scope.errors, function(v, k){
                                        if(angular.isString(v)) {
                                            string += "<li>" + v + "</li>";
                                        }
                                    });
                                }
                                string += "</ul>";
                            }

                            $scope.showAlert('danger', 'Error!', string);
                        }
                        else{
                            $scope.showAlert('danger', 'Error!', 'Failed to connect. Try again');
                        }
                    }
                    else{
                        $scope.showAlert('danger', 'Error!', 'Unable to connect to server. Try again');
                    }
                }
                else{
                    $scope.showAlert('danger', 'Error!', 'invalid format of response');
                }
            }
            else{
                $scope.showAlert('danger', 'Error!', 'Unable to talk with process services');
            }


        }, function(error){
            $scope.loading = false;
            $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
        });

    };
    $scope.paymentValidation = function(info){
        var valid = true;

        if(!angular.isUndefined(info[0].confirm_tos) && info[0].confirm_tos){
        }
        else{
            valid = false;
            $scope.showAlert('danger', 'Error!', 'Please agree with the terms and conditions');
        }


        return valid;
    };
    $scope.ObjectNotEmpty = function(obj){
        var status = true;
        angular.forEach(obj, function(val, key){
           if(obj[key] === '' || obj[key] === null){
               status =  false;
           }
        });
        return status;
    };
    $scope.submitApplicationForm = function(isValid) {
        // check to make sure the form is completely valid
        if (isValid) {
            var validation = $scope.applicationValidation();
            if(validation){
                $timeout(function(){
                    angular.element('.nav-tabs a[href="#personal"]').trigger('click');
                    $('[href="#personal"]').tab('show');
                });
                //$('.nav-tabs a[href="#personal"]').tab('show');
                $scope.active_form = 2;
                $scope.editable1 = true;
            }
            else{}

        }
        else{
            alert('Not valid');
        }
    };
    $scope.applicationValidation = function(){
        if(!angular.isUndefined($scope.payment[$scope.cindex].web_id) && $scope.payment[$scope.cindex].web_id !== "") {
            if ($scope.payment[$scope.cindex].web_id.length === 12) {
                var country_code = $scope.payment[$scope.cindex].web_id.substr(0, 3);
                // console.log(country_code);
                var commission_center = $scope.payment[$scope.cindex].web_id.substr(3, 1);
                // console.log(commission_center);
                if ($scope.payment[$scope.cindex].center !== null) {
                    if ($scope.payment[$scope.cindex].center.prefix !== commission_center) {
                        $scope.showAlert('danger', 'Error!', 'You are selecting wrong High Commission center for your web file Application');
                        return false;
                    }
                    else{
                        // CHECK IF WEB FILE HAS PAYMENT ALREADY
                        var resp = $.ajax({
                            type: "GET",
                            url: basepath+'/payment/check/'+$scope.payment[$scope.cindex].web_id,
                            async: false
                        }).responseText;
                        // console.log('Resp: '+resp);
                        if(resp === 'true'){
                            $scope.showAlert('danger', 'Error!', 'This webfile has a payment already');
                            // $scope.showAlert('danger', 'Error!', 'All IVACs will be remain closed till further notice, due to unstable situation. Next application date will be informed through SMS & It is requested to pick up the passport on the next working day.');
                            return false;
                        }
                        else{
                            return true;
                        }
                    }
                }
                else {
                    $scope.showAlert('danger', 'Error!', 'Please choose your center first');
                    return false;
                }

            }
            else {
                $scope.showAlert('danger', 'Error!', 'Please correct your web file number');
                return false;
            }
        }
        else{
            $scope.showAlert('danger', 'Error!', 'Please input your web file number');
            return false;
        }
    };
    $scope.submitPersonalForm = function(isValid) {
        // check to make sure the form is completely valid
        if (isValid) {
            $timeout(function(){
                angular.element('.nav-tabs a[href="#overview"]').trigger('click');
                $('[href="#overview"]').tab('show');
            });
            //$('.nav-tabs a[href="#personal"]').tab('show');
            $scope.active_form = 3;
            $scope.editable2 = true;
            $scope.editable3 = true;

            // Validate new amount change
            /*if(!angular.isUndefined($scope.payment[$scope.cindex].appointment)){
                var db_time = Date.createFromMysql($scope.payment[$scope.cindex].amountChangeData.new_fees_applied_from, true).getTime();
                var split_appointment = $scope.payment[$scope.cindex].appointment.split("-");
                var appointment_time = new Date(split_appointment[2], split_appointment[1] - 1,split_appointment[0]).getTime();
                if(appointment_time >= db_time){
                    console.log($scope.payment[$scope.cindex].amountChangeData.new_visa_fee);
                    $scope.payment[$scope.cindex].amount = $scope.payment[$scope.cindex].amountChangeData.new_visa_fee;
                }
                else{
                    $scope.payment[$scope.cindex].amount = $scope.payment[$scope.cindex].amountChangeData.old_visa_fees;
                }
            }*/

            if($scope.cindex < $scope.maxindex) {
                if( ($scope.cindex + 1) >= $scope.maxindex){
                    $scope.addDisabled = true;

                    $scope.editable1 = false;
                    $scope.editable2 = false;
                    $scope.editable3 = false;
                }

                $scope.cindex = $scope.payment.length;
            }
            else{
                $scope.showAlert('danger', 'Error!', 'You have reached maximum limit ('+$scope.maxindex+') for adding application');
            }

            // console.log($scope.cindex);
        }
        else{
            alert('Not valid');
        }
    };

    $scope.editApplication = function(pay){
        var index = -1;
        $scope.verifyOtp = false;
        $scope.showAppointData = false;
        $scope.payment.some(function(obj, i) {
            return obj.web_id === pay.web_id ? index = i : false;
        });
        $scope.phoneEditable = true;
        $scope.emailEditable = true;

        if(index >= 0){
            $scope.cindex = index;
            $scope.active_form = 1;
        }
        else{
            // No index of application found
        }
    };
    $scope.removeApplication = function(pay){
        var confirm = window.confirm($scope.txt("confirmApplicationRemoval"));
        if(confirm){
            // console.log(confirm);

            var index = -1;
            $scope.payment.some(function(obj, i) {
                return obj.web_id === pay.web_id ? index = i : false;
            });
            // console.log(index);
            if(index >= 0){
                $scope.payment.splice(index, 1);
                $scope.cindex = $scope.payment.length;
                if($scope.payment.length === 0){
                    $scope.active_form = 1;
                }
                else{
                    $scope.addDisabled = false;
                }
            }
            else{
                // No index of application found
            }
        }
        else{
            // Applicant do not want to delete his/her file
        }
    };
    $scope.addMoreApplication = function(){
        $scope.active_form = 1;
    };






    $scope.EditInfo = function(){
        $timeout(function(){
            angular.element('.nav-tabs a[href="#application"]').trigger('click');
            $('[href="#application"]').tab('show');
        });
        $scope.active_form = 1;
    };

    $scope.setWidgetId = function (widgetId) {
        // store the `widgetId` for future usage.
        // For example for getting the response with
        // `recaptcha.getResponse(widgetId)`.
        //console.log(recaptcha.getResponse(widgetId));
    };
    $scope.setResponse = function (response) {
        // send the `response` to your server for verification.

    };
    $scope.cbExpiration = function() {
        // reset the 'response' object that is on scope
    };

    $scope.setLang = function(lang){
        if(lang !== ''){
            $scope.lang = lang;
            localStorage.setItem("in_lang", lang);
        }
        else {
            if (localStorage.getItem("in_lang") === null) {
                localStorage.setItem("in_lang", $scope.lang);
            }
            else {
                if (localStorage.getItem("in_lang") === "en" || localStorage.getItem("in_lang") === "bn") {
                    $scope.lang = localStorage.getItem("in_lang");
                }
            }
        }
    };
    $scope.allNotice = allNotice; 
    $scope.lang = 'en';
    $scope.setLang("");
    $scope.getNotice = function(noticeKey) {
        if ($scope.allNotice[noticeKey]) {
            return $scope.allNotice[noticeKey][$scope.lang];
        }
        return null;
    };
    $scope.getWarning = function(noticeKey) {
        if ($scope.allNotice[noticeKey]) {
            return $scope.allNotice[noticeKey]['is_warning'];
        }
        return null;
    };
    $scope.txt = function(id){
        var text = $scope.language.filter(function(item) {
            return item.id === id;
        })[0];
        if(!angular.isUndefined(text)) {
            if (text.id === id) {
                return text[$scope.lang];
            }
        }
    };

    Number.prototype.round = function(p) {
        p = p || 10;
        return parseFloat( this.toFixed(p) );
    };

    $scope.randomBorderColor = function(){
        var colors = [];
        for(var k =0; k<4; k++) {
            var cc = [];
            for (var i = 0; i < 30; i++) {
                cc[i] = Math.floor(Math.random() * 0xFFFFFF).toString(16);
            }
            colors[k] = cc;
        }
        return colors;
    };
    $scope.randomBorderColor = $scope.randomBorderColor();


    $scope.submitQueryForm = function(form){
        if(form){
            if($scope.query.web_id !== "" && $scope.query.email !== ""){

                var data = $.param({
                    'apiKey': $scope.apiKey,
                    'action': 'getPayment',
                    'info' : $scope.query,
                    '_token' : csrf_token
                });

                var config = {
                    headers : {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
                    }
                };

                $scope.loading = true;
                $http.post(basepath+'/get_payment_info', data, config).then(function(resp){
                    $scope.loading = false;
                    // console.log(resp);
                    if(!angular.isUndefined(resp.data)){
                        if(!angular.isUndefined(resp.data.status)){

                            if(!angular.isUndefined(resp.data.status)){
                                if(resp.data.status === 'OK'){

                                    if(!angular.isUndefined(resp.data.data)) {
                                        var json = '';
                                        try {
                                            json = JSON.parse(resp.data.data);
                                        }
                                        catch (e) {
                                            json = resp.data.data;
                                        }


                                        $scope.transaction = json;
                                    }
                                    else{

                                    }
                                }
                                else if(resp.data.status === 'FAIL'){
                                    $scope.loading = false;
									$scope.showAlert('danger', 'Error!', resp.data.message);
                                }
                                else{
                                    $scope.showAlert('danger', 'Error!', 'Unable to connect to server. Try again');
                                }
                            }
                            else{
                                $scope.showAlert('danger', 'Error!', 'invalid format of response');
                            }
                        }
                        else{
                            $scope.showAlert('danger', 'Error!', 'invalid format of response');
                        }
                    }
                    else{
                        $scope.showAlert('danger', 'Error!', 'Unable to talk with process services');
                    }


                }, function(error){
                    $scope.loading = false;
                    $scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
                });

            }
            else{
                $scope.showAlert('danger', 'Input Error!', 'Please fill web file number and your email for query');
            }
        }
    };

    $scope.isObjectEmpty = function(card){
        return Object.keys(card).length === 0;
    };

    $scope.showAlert = function(type, title, content){
        switch (type){
            case "success":
                $scope.alert_modal_class = 'modal-full-color-'+type;
                $scope.alert_icon_class = 's7-check';
                $scope.open_modal = 1;
                break;
            case "danger":
                $scope.alert_modal_class = 'modal-full-color-'+type;
                $scope.alert_icon_class = 's7-close-circle';
                $scope.open_modal = 1;
                break;
            case "warning":
                $scope.alert_modal_class = 'modal-full-color-'+type;
                $scope.alert_icon_class = 's7-attention';
                $scope.open_modal = 1;
                break;
            case "info":
                $scope.alert_modal_class = 'modal-full-color-'+type;
                $scope.alert_icon_class = 's7-info';
                $scope.open_modal = 1;
                break;
            case "dark":
                $scope.alert_modal_class = 'modal-full-color-'+type;
                $scope.alert_icon_class = 's7-info';
                $scope.open_modal = 1;
                break;
        }
        $scope.alert_modal_title = title;
        $scope.alert_modal_content = $sce.trustAsHtml(content+"");
    };
    $scope.modal = {
        modalSelector : $('#modal-11'),
        hideModal : function(){
            if(this.modalSelector.hasClass('md-show')) {
                this.modalSelector.removeClass('md-show');
            }
            $interval.cancel($scope.timeObj);
            $scope.reg.id = $scope.generateUnique();
            return true;
        },
        showModal : function(){
            if(!this.modalSelector.hasClass('md-show')) {
                this.modalSelector.addClass('md-show');
            }
            return true;
        }
    };

    $scope.showHint = function(){
        $('#hintModal').modal('show');
    };

    $scope.refresh_captcha = function(){

        var captcha = $('img.captcha-img');
        var config = captcha.data('refresh-config');
        $.ajax({
            method: 'GET',
            url: basepath+'/get_captcha/' + config,
        }).done(function (response) {
            captcha.prop('src', response);
        });
    };

    $scope.activeForm = function(id){
        switch (id){
            case 1 :
                if($scope.editable1){
                    $scope.active_form = 1;
                }
                break;
            case 2 :
                if($scope.editable2){
                    $scope.active_form = 2;
                }
                break;
            case 3:
                if($scope.editable3){
                    $scope.active_form = 3;
                }
                break;
            default:
                break;
        }
    };

    $scope.fixNumber = function(contact){
        if(!angular.isUndefined(contact) && contact.length > 8) {
            var numpref = contact.substr(0, 2);

            if ( numpref !== '01') {
                $scope.payment[$scope.cindex].phone = contact.replaceAt(1, '1');
            }
            if($scope.payment[0].phone && $scope.payment[0].phone != ''){
                if($scope.payment[0].phone != $scope.payment[$scope.cindex].phone){
                    $scope.showAlert('danger', 'Error!', 'Phone number not matched with first webfile mobile number');
                    $scope.PersonalForm.$invalid = true;
                }
            }

        }

    };

    $scope.checkEmail = function (contact){
        if(!angular.isUndefined(contact) && contact.length > 3) {
            if($scope.payment[0].email && $scope.payment[0].email != ''){
                if($scope.payment[0].email != $scope.payment[$scope.cindex].email){
                    $scope.showAlert('danger', 'Error!', 'Email address not matched with first webfile email');
                    $scope.PersonalForm.$invalid = true;
                }
            }

        }
    }

    $scope.checkVerifyBtn = function (otpData){
        // console.log(otpData);
        if(!angular.isUndefined(otpData)) {
            if(otpData.length == 6){
                $scope.disableVerifyBtn = false;
            } else {
                $scope.disableVerifyBtn = true;
            }
        } else {
            $scope.disableVerifyBtn = true;
        }
    }


	$timeout(function(){
		if(!angular.isUndefined(retry_again)){
			if(retry_again){
				if(!angular.isUndefined(last_order_id)){
					if(last_order_id != ''){

						var data = $.param({
							'apiKey': $scope.apiKey,
							'action': 'getSinglePayment',
							'order_id' : last_order_id,
							'_token' : csrf_token
						});

						var config = {
							headers : {
								'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
							}
						};

						$scope.loading = true;
						$http.post(basepath+'/get_payment_info', data, config).then(function(resp){
							$scope.loading = false;
							if(!angular.isUndefined(resp.data.data.data)){
								try{
									var data = JSON.parse(resp.data.data.data);
								}
								catch(e){
									var data = "";
								}
								if(!angular.isUndefined(data.info)){

									if(!angular.isUndefined(data.info.web_id)){
										$scope.payment[$scope.cindex] = data.info;
										$timeout(function(){
											angular.element('.nav-tabs a[href="#overview"]').trigger('click');
											$('[href="#overview"]').tab('show');
										});
										$scope.active_form = 3;
									}
								}
							}

						}, function(error){
							$scope.loading = false;
							$scope.showAlert('danger', 'Error!', 'Your session timeout or can not be served now, Try again later');
						});

					}
				}
			}
		}

	},1500);

    $scope.$watch('payment[cindex]', function() {
        /*console.log($scope.payment[$scope.cindex]);*/
    });

}]);


String.prototype.replaceAt=function(index, replacement) {
    return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
};

Date.createFromMysql = function(mysql_string, begining)
{
    var t, result = null;

    if( typeof mysql_string === 'string' )
    {
        t = mysql_string.split(/[- :]/);

        //when t[3], t[4] and t[5] are missing they defaults to zero
        if(begining){
            result = new Date(t[0], t[1] - 1, t[2], 0, 0, 0);
        }
        else {
            result = new Date(t[0], t[1] - 1, t[2], t[3] || 0, t[4] || 0, t[5] || 0);
        }
    }

    return result;
}
