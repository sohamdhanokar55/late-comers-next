"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const AuthContext = React.createContext();

export function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDataobj, setUserDataObj] = useState(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);

  function signUp(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(dept, password) {
    return signInWithEmailAndPassword(auth, dept, password);
  }
  function logOut() {
    setUserDataObj({});
    setCurrentUser(null);
    return signOut(auth);
  }
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        // Set user to local context state
        setLoading(true);
        setCurrentUser(user);
        if (!user) {
          console.log("No user found");
          return;
        }
        // If user exists, fetch data
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        console.log("fetching user data");
        let firebaseData = {};
        if (docSnap.exists()) {
          const unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
            console.log("Found user data");
            firebaseData = docSnap.data(); // Update state with real-time data
            setUserDataObj(firebaseData);
          });
        }
        setUserDataObj(firebaseData);
      } catch (e) {
        console.log("Error ", e);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userDataobj,
    setUserDataObj,
    signUp,
    logOut,
    login,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
