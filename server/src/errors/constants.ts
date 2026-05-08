export const ERROR = Object.freeze({
    'DU':{status:400, code:'DU', message: 'Duplicate User'},
    'UNF':{status:400, code:'UNF', message: 'User Not Found'},
    'DURI':{status:400, code:'DURI', message: 'Duplicate URI'},
    'MML':{status:400, code:'MML', message: 'Missing Magic Link'},
    'IML':{status:400, code:'IML', message: 'Invalid Magic Link'},
    'MII':{status:400, code:'MII', message: 'Missing Important Information'},
    'ATM':{status:401,code:'ATM',message:'Authentication Token Missing'},
    'ATI':{status:401,code:'ATI',message:'Authentication Token Invalid'},
    'AJTM':{status:401,code:'AJTM',message:'Authentication JWT Token Malformed'},
    'IMD':{status:403,code:'IMD',message:'Invalid MetaData'}
});
