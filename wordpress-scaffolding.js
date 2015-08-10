#!/usr/bin/env node

// use npm link to test this plugin while in dev
var q = require('q');
var fs = require('fs');
var wp = require('wp-cli');
var http = require('http');
var chalk = require('chalk');
var mysql = require('mysql');
var prompt = require('cli-prompt');
var commander = require('commander');
var unzip = require('decompress-zip');


// Set up basic command line args
commander
    .version('1.0.0')
    .option('-i, --install', 'relative path to the stylesheet to process')
    .option('-h, --help', 'get help on the plugin')
    .option('-v, --version', 'get information on the latest WordPress release.')
    .parse(process.argv);

// Lets set up some default Vars

//convert to object

var config = {
    custom_dir: true,
    theme:      "https://github.com/roikles/Flexbones/archive/master.zip",
    user:       "root",
    pass:       "root",
    folder:     "project-folder",
    url:        "http://localhost/" + wp_folder,
    title:      "Project Title",
    email:      "me@example.com",
    db_host:    "localhost",
    db_name:    "demowpdb",
    db_user:    "root",
    db_pass:    "root"
};

//var wp_version      = '4.2.4';
/*var wp_custom_dir   = false;
var wp_theme        = 'https://github.com/roikles/Flexbones/archive/master.zip';
var wp_user         = 'root';
var wp_pass         = 'root';
var wp_folder       = 'project-folder';
var wp_url          = 'http://localhost/' + wp_folder;
var wp_title        = 'Project Title';
var wp_email        = 'me@example.com';

// Database details
var wp_db_name      = 'demowpdb';
var wp_db_host      = 'localhost';
var wp_db_user      = 'root';
var wp_db_pass      = 'root';*/

var connection = mysql.createConnection({
    host     : config.db_host,
    user     : config.db_user,
    password : config.db_pass
});


/**
 * Handle all errors through a single 
 * callback function
 */

function callback (error, data) {
    if(error) {
        console.log(chalk.red(error));
        return;
    }
    return data;
}


/**
 * getWpVersionInfo - gets the lates WordPress version and download links
 * @param  {Function} cb Callback function that is neccessary for data and errors
 * @return {Object}   Thisreturns selected data extracted from the api/json request
 */
function getLatestWordpress (callback){
    // Pass the API details to the http.get method
    http.get({
        host: 'api.wordpress.org',
        path: '/core/version-check/1.7/'
    }, function(response) {
        // Ensure we get a usable encoded file
        response.setEncoding('utf8');
        // Instantiate body as a blank var
        var body = '';
        
        // Collect all the Async data into the body var
        response.on('data', function (chunk) {
            body += chunk;       
        });
        // On async completion parse the JSON or handle any parsing errors that arise
        response.on('end', function () {
            try {
                jsonData = JSON.parse(body);
            } catch (error){
                callback( 'Unable to parse WordPress Version from JSON. ' + error );
            }

            callback(null, {
                version:             "Latest Version: " + jsonData.offers[0].current,
                full_download:       jsonData.offers[0].packages.full,
                no_content_download: jsonData.offers[0].packages.no_content 
            });

        });

    // Handle any errors with the request
    }).on('error', function (error) {
        //console.error(chalk.red('Error with request:', error.message));
        callback('Error with request: ', error.message);
    });

}

// create a directory synchronously
function createDirectorySync(dir){
        
    try {

        fs.mkdirSync(dir);

    } catch(error) {
        // If the error is not a file exists error
        if ( error.code != 'EEXIST' ){
            callback( 'Unable to create dir: ' + error );
        }
        // If file exists
        callback('Directory already exists: ' + dir);
        return;
    }
    
    callback( null, console.log( chalk.green( 'Directory created: ' + dir ) ) );

}


function createWordpressDirectories(customDirStructure){

    createDirectorySync('./wp-content');
    createDirectorySync('./wp-content/themes');
    createDirectorySync('./wp-content/plugins');
    fs.writeFileSync('./wp-content/index.php', '<?php\r\n// Silence is golden.');

    if(customDirStructure){
        createDirectorySync('./wordpress');
    }

}


// Unzippy in a jiffy
function extractWordpress(wp_zip){
    
    // create a Wordpress directory (ties in to the custom dir structure stuff)
    //fs.mkdirSync('./wordpress');

    var unzipper = new unzip(wp_zip);

    unzipper.on('error', function (err) {
        callback(error.message);
    });

    unzipper.on('progress', function (fileIndex, fileCount) {
        // console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
    });

    unzipper.on('extract', function (log) {
        console.log(chalk.green('Finished extracting Wordpress!'));
        fs.unlink(wp_zip, function (err) {
            callback(null, console.log( chalk.yellow( 'removed ' + wp_zip) ) );
        });
    });

    unzipper.extract({
        path: './',
    });

}


// Download wordPress

function downloadWordpress(){

    //console.log(chalk.green(result.no_content_download)); 

    getLatestWordpress( function ( err,result ) {
        
        console.log( chalk.yellow( 'Downloading ' + result.no_content_download ) ); 

        var zip_name = 'wordpress.zip';

        var file = fs.createWriteStream(zip_name);
        
        var request = http.get(result.no_content_download, function(response) {
            
            response.pipe(file);
            file.on('close', function() {
                file.close();  // close() is async, call cb after close completes.

                callback(null, console.log( chalk.green( 'Wordpress Downloaded successfully!') ) );

                // ^Remember to include console.logs() because callback will just output any old data and doesnt parse it.
                extractWordpress(zip_name);
            });
        
        }).on('error', function (error) {
        
            callback('Error with download of Wordpress: ', error.message);
        
        });
    });

}


// Check if DB already exists
function databaseExists(){

    connection.query( 'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = "' + config.db_name + '"', function(error,response){
        
        //connection.end();

        if(error){
            return true; // DB exists
        }

        //callback(null, console.log( chalk.green( 'DB Doesnt exist: ' + wp_db_name ) ) );

    } );

}


// Create Db
function createDatabase(){

    if( !databaseExists(config.db_name) ){

        connection.query( 'CREATE DATABASE ' + config.db_name , function(error, response){
            
            if(error){
                callback ("create db error: " + error);
                return;
            }

            callback( null, console.log( chalk.green( 'created DB: ' + config.db_name ) ) );

            connection.end();

        });

    }
    
}


// configureWordpress


/*

    "wp core config --dbname="+ wp_db_name +" --dbuser="+ wp_db_user +" --dbpass="+ wp_db_pass +" --dbhost="+ wp_db_host +" --extra-php='define(\"WP_DEBUG\",true);\ndefine(\"WP_CONTENT_DIR\", dirname(__FILE__). \"/wp-content\" );\ndefine(\"WP_CONTENT_URL\",\"http://\". $_SERVER[\"HTTP_HOST\"]. \"/"+ wp_folder +"/wp-content\");'",
    
    // Move wp-config to parent dir
    
    'mv wordpress/wp-config.php wp-config.php',
    
    // Create Database tables
    
    'wp core install --url='+ wp_url +' --title="'+ wp_title +'" --admin_user='+ wp_user +' --admin_password='+ wp_pass +' --admin_email='+ wp_email,
    
    // Add custom dir structure
    
    'wp option update home ' + wp_url,
    'wp option update siteurl ' + wp_url + '/wordpress'
*/

function configureWordpress() {

    wp.discover( {path:'./'},function(wp){
        

        // extra php can be removed on no customDir install
        
        wp.core.config({
            dbname: config.db_name,
            dbuser: config.db_user,
            dbpass: config.db_pass,
            dbhost: config.db_host,
            extraphp:'define("WP_DEBUG",true);\ndefine("WP_CONTENT_DIR", dirname(__FILE__). "/wp-content" );\ndefine("WP_CONTENT_URL","http://" . $_SERVER["HTTP_HOST"]. "/"+ wp_folder +"/wp-content");'
        },function(error, results){
            
            if(error){
                callback(error);
                return;
            }

            callback(results);
        });
    
    });
  
}


// Install Wordpress
function installWordpress(){
    
    createWordpressDirectories(true)
    .then( downloadWordpress() )
    .then( connection.connect(function(error) {
        if(error){
            callback( "db error: " + error );
            return;
        }

        createDatabase();

    }) )
    .then ( configureWordpress() );
    
    

}

installWordpress();