import {register} from "@shopify/web-pixels-extension";

register(async ({ analytics, browser, init, settings }) => {
  const SESSION_DURATION = 18e5;
  const DOMAIN = 'https://test_domain.com/api'; //MAKE SURE DOMAIN IS CORRECT
  const LANDING_URL = `${DOMAIN}/brandUserLanding?`;
  const PURCHASE_URL = `${DOMAIN}/markSale?`;
  const PIXEL_ERROR_URL = `${DOMAIN}/markSalePixelError?`;
  const PLATFORM = 'ATG'; //MAKE SURE PLATFORM IS CORRECT


  analytics.subscribe('page_viewed', async (event) => {
    console.log('final updated change');
    console.log('Event Context updated:', event.context);

    // Attempt to extract the URL from other possible properties
    const currentUrl = event.context.window.location.href || 'URL not available';

    // Print the current URL to the console
    const currTime = +new Date;
    // Validate and parse the URL
    const urlParams = new URLSearchParams(currentUrl);

   const atgSessionId = urlParams.get('atgSessionId');
   const utm_source = urlParams.get('utm_source');
   const utm_medium = urlParams.get('utm_medium');
   const utm_campaign = urlParams.get('utm_campaign');
   const gclid = urlParams.get('gclid');
   const fbclid = urlParams.get('fbclid');


   let lastSession = await browser.localStorage.getItem('atgLastSession');
   let atgSessionId_stored = await browser.localStorage.getItem('atgSessionId');
    let sessionChanged = 1;
   if(atgSessionId && (atgSessionId !== atgSessionId_stored)){
     browser.localStorage.setItem('atgSessionId', atgSessionId);
   }
   else{
     sessionChanged = 0;
   }
   if((atgSessionId || atgSessionId_stored ) && (gclid !== null || fbclid !== null || utm_source !== null || utm_medium !== null || utm_campaign !== null|| sessionChanged || !lastSession || (currTime - lastSession) > SESSION_DURATION)){
     let ga = await browser.cookie.get('_ga')
     let queryParams = {
       atgSessionId: atgSessionId || atgSessionId_stored,
       platform: PLATFORM,
       utm_source: utm_source,
       utm_medium: utm_medium,
       utm_campaign: utm_campaign,
       gclid: gclid,
       fbclid: fbclid,
       ga: ga
     };
     let queryString = new URLSearchParams(queryParams).toString();
     let finalURL = `${LANDING_URL}${queryString}`;
     browser.sendBeacon(finalURL);
   }
   browser.localStorage.setItem('atgLastSession', currTime);
  });


  analytics.subscribe('checkout_completed', async (event) => {
   let checkoutObj = null;
   let atgSessionId = null;
   let productTitles = null;
   let couponCode = null;
   let saleAmount = null;
   let currency = null;
   let orderId = null;
   let orderIdShopify = null;


    let queryParams = {
     atgSessionId: atgSessionId,
     orderId: orderId,
     orderIdShopify: orderIdShopify,
     saleAmount: saleAmount,
     currency: currency,
     platform: PLATFORM,
     items: productTitles,
     couponCode: couponCode,
     numOrders: 1
   };
    try{
     checkoutObj = event.data.checkout;
     atgSessionId = await browser.localStorage.getItem('atgSessionId');
     couponCode = checkoutObj.discountApplications?.[0]?.title;
     if(atgSessionId || couponCode){
       productTitles = '~';
       checkoutObj.lineItems.forEach((line_item) => {
         productTitles += `${line_item.title}**${line_item.quantity}~`;
       });
       saleAmount = checkoutObj.totalPrice.amount;
       currency = checkoutObj.totalPrice.currencyCode;
       orderIdShopify = checkoutObj.order.id;
       orderId = checkoutObj.order.id;

       const checkout_url = event.context.window.location.href || 'URL not available';
        let tokenKey = '';
        let tokenValue = '';
        let pathname = event.context.window.location.pathname

        if(pathname){
          let urlParts = pathname.split('/')
          if(pathname.includes('checkouts')){
              if(urlParts.length>1){
                tokenKey = 'referenceToken'
                tokenValue = urlParts[urlParts.length-2]
              }
              else{
                console.log('urlParts.length<> > 1')
              }
        }
        else if(pathname.includes('orders')){
          console.log('pathname.includes(orders))')
            if(urlParts.length>0){
              console.log('urlParts.length>0')
                tokenKey = 'orderToken'
                tokenValue = urlParts[urlParts.length-1]
            }
            else{
              console.log('urlParts.length<> >0')
            }
        }
      }
       queryParams = {
         ...queryParams,
         atgSessionId: atgSessionId,
         orderId: orderId,
         orderIdShopify: orderIdShopify,
         saleAmount: saleAmount,
         currency: currency,
         platform: PLATFORM,
         items: productTitles,
         couponCode: couponCode,
          tokenKey: tokenKey,
          tokenValue: tokenValue,
         numOrders: 1
       };

       let queryString = new URLSearchParams(queryParams).toString();
       let finalURL = `${PURCHASE_URL}${queryString}`;
       browser.sendBeacon(finalURL);
       browser.localStorage.removeItem('atgSessionId');
     }
   }
   catch(error){
     queryParams = {
       ...queryParams,
       errorMessage: error.message,
       stackTrace: error.stack,
       userAgent: navigator.userAgent,
       location: event.context.window.location.href // Adding location for more context
     }
     let queryString = new URLSearchParams(queryParams).toString();
     let finalURL = `${PIXEL_ERROR_URL}${queryString}`;
     browser.sendBeacon(finalURL);
   }
  });
});

