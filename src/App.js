import './App.css';
import React, {useEffect, useState} from 'react';
import API, {graphqlOperation} from '@aws-amplify/api';
import {messagesByChannelID} from './graphql/queries';
import {Auth} from '@aws-amplify/auth';
import {onCreateMessage} from './graphql/subscriptions';
import {createMessage} from "./graphql/mutations";
import {AmplifySignOut, withAuthenticator} from '@aws-amplify/ui-react';

import '@aws-amplify/pubsub';

function App() {

    const [messages, setMessages] = useState([]);
    const [messageBody, setMessageBody] = useState('');
    const [userInfo, setUserInfo] = useState(null);

    // load messages
    const getMessages = async () => {
        try {
            const response = await API
                .graphql(graphqlOperation(messagesByChannelID, {
                    channelID: '1',
                    sortDirection: 'ASC'
                }))

            const items = response?.data?.messagesByChannelID?.items;

            if (items) {
                setMessages(items);
            }

        } catch (err) {
            console.log('Error', err);
        }
    }

    const getUser = async () => {
        try {
            const userDetails = await Auth.currentUserInfo();
            setUserInfo(userDetails);
        } catch (err) {
            console.log('Auth Error', err);
        }
        Auth.currentUserInfo();
    }

    const loadScreen = async () => {
        await getMessages();
        await getUser();
    }

    useEffect(() => {
        loadScreen();
    }, []);

    // message create
    useEffect(() => {
        const subscription = API
            .graphql(graphqlOperation(onCreateMessage))
            .subscribe({
                next: (event) => {
                    setMessages([...messages, event.value.data.onCreateMessage]);
                }
            });

        return () => {
            subscription.unsubscribe();
        };
    }, [messages]);

    // edit message
    const handleChange = (event) => {
        setMessageBody(event.target.value);
    };

    // submit message
    const handleSubmit = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        try {

            const input = {
                channelID: '1',
                author: userInfo?.id,
                body: messageBody.trim()
            };

            setMessageBody('');
            await API.graphql(graphqlOperation(createMessage, {input}))
        } catch (error) {
            console.warn(error);
        }
    };

    return (
        <div className="app">
            {userInfo && (
                <div className="header">
                    <div className="profile">
                        You are logged in as: <strong>{userInfo.username}</strong>
                    </div>
                    <AmplifySignOut/>
                </div>
            )}
            <div className="container">
                <div className="messages">
                    <div className="messages-scroller">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={message.author === userInfo?.id ? 'message me' : 'message'}>{message.body}</div>
                        ))}
                    </div>
                </div>
                <div className="chat-bar">
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            name="messageBody"
                            placeholder="Type your message here"
                            onChange={handleChange}
                            value={messageBody}
                        />
                    </form>
                </div>
            </div>
        </div>
    );
};

export default withAuthenticator(App);