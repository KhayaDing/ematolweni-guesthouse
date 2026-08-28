const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'./tests', fullyParallel:false, workers:1, timeout:60000,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:8091',trace:'retain-on-failure',screenshot:'only-on-failure',reducedMotion:'reduce'},
  projects:[
    {name:'desktop',use:{viewport:{width:1440,height:900}}},
    {name:'tablet',use:{viewport:{width:768,height:1024}}},
    {name:'mobile',use:{viewport:{width:390,height:844}}}
  ],
  webServer:{command:'node scripts/preview.cjs dist 8091',url:'http://127.0.0.1:8091',reuseExistingServer:false}
});
