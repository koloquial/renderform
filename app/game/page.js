'use client'
import { useSelector, useDispatch } from 'react-redux';
import { setName } from '@/store/nameSlice';
import { useState } from 'react';
import MapDisplay from '@/components/MapDisplay';


export default function NewGame() {
    const [inputName, setInputName] = useState('');
    const dispatch = useDispatch();
    const value = useSelector((state) => state.name.value);

    function handleName(e){
        e.preventDefault();
        dispatch(setName(inputName));
    }

    function handleChange(e){
        setInputName(e.target.value);
    }

    return (
        <div className='container'>
            <div className='game-container'>
                <MapDisplay />
            </div>
        </div>
    );
}
