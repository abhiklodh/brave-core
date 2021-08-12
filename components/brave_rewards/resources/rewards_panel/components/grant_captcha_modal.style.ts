/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import styled from 'styled-components'

export const root = styled.div`
  width: 350px;
  min-height: 250px;
  background: var(--brave-palette-white);
  padding: 17px;
  border-radius: 8px;
  box-shadow: 0px 0px 16px rgba(99, 105, 110, 0.2);
  text-align: center;
  font-size: 14px;
  line-height: 20px;
`

export const header = styled.div`
  margin-top: 8px;
  margin-bottom: 9px;
  font-weight: 500;
  font-size: 18px;
  line-height: 20px;
`

export const text = styled.div``

export const summary = styled.div`
  margin: 15px 30px 0;
  background: var(--brave-palette-neutral200);
  border-radius: 8px;
  padding: 10px;
`

export const summaryItem = styled.div`
  margin: 5px 0;
`

export const summaryValue = styled.div`
  margin-top: 5px;
  font-weight: 600;
`

export const okButton = styled.div`
  margin: 18px 30px 15px;

  button {
    width: 100%;
    background: var(--brave-color-brandBatInteracting);
    color: var(--brave-palette-white);
    padding: 10px;
    margin: 0;
    border: none;
    border-radius: 48px;
    font-weight: 600;
    font-size: 13px;
    line-height: 20px;
    cursor: pointer;

    &:active {
      background: var(--brave-palette-blurple400);
    }
  }
`
